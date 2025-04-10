#include <assert.h>
#include <bare.h>
#include <jpeglib.h>
#include <js.h>
#include <setjmp.h>
#include <stdlib.h>
#include <utf.h>

typedef struct {
  struct jpeg_error_mgr handle;
  jmp_buf jump;
  char message[JMSG_LENGTH_MAX];
} bare_jpeg_error_t;

static void
bare_jpeg__on_error_exit(j_common_ptr info) {
  bare_jpeg_error_t *error = (bare_jpeg_error_t *) info->err;

  info->err->format_message(info, error->message);

  longjmp(error->jump, 1);
}

static void
bare_jpeg__on_emit_message(j_common_ptr info, int level) {}

static void
bare_jpeg__on_finalize(js_env_t *env, void *data, void *finalize_hint) {
  free(data);
}

static js_value_t *
bare_jpeg_decode(js_env_t *env, js_callback_info_t *info) {
  int err;

  size_t argc = 1;
  js_value_t *argv[1];

  err = js_get_callback_info(env, info, &argc, argv, NULL, NULL);
  assert(err == 0);

  assert(argc == 1);

  void *jpeg;
  size_t len;
  err = js_get_typedarray_info(env, argv[0], NULL, &jpeg, &len, NULL, NULL);
  assert(err == 0);

  bare_jpeg_error_t error;

  struct jpeg_decompress_struct decoder;

  decoder.err = jpeg_std_error(&error.handle);

  jpeg_create_decompress(&decoder);

  error.handle.error_exit = bare_jpeg__on_error_exit;
  error.handle.emit_message = bare_jpeg__on_emit_message;

  if (setjmp(error.jump)) {
  err:
    err = js_throw_error(env, NULL, error.message);
    assert(err == 0);

    jpeg_destroy_decompress(&decoder);

    return NULL;
  }

  jpeg_mem_src(&decoder, jpeg, len);

  if (jpeg_read_header(&decoder, true) != JPEG_HEADER_OK) goto err;

  jpeg_start_decompress(&decoder);

  int width = decoder.output_width;
  int height = decoder.output_height;
  int channels = decoder.output_components;

  js_value_t *result;
  err = js_create_object(env, &result);
  assert(err == 0);

#define V(n) \
  { \
    js_value_t *val; \
    err = js_create_int64(env, n, &val); \
    assert(err == 0); \
    err = js_set_named_property(env, result, #n, val); \
    assert(err == 0); \
  }

  V(width);
  V(height);
#undef V

  len = width * height * 4;

  js_value_t *buffer;

  void *data;
  err = js_create_unsafe_arraybuffer(env, len, &data, &buffer);
  assert(err == 0);

  err = js_set_named_property(env, result, "data", buffer);
  assert(err == 0);

  JSAMPARRAY scanlines = (*decoder.mem->alloc_sarray)((j_common_ptr) &decoder, JPOOL_IMAGE, width * channels, 1);

  int row = 0;

  while (decoder.output_scanline < decoder.output_height) {
    jpeg_read_scanlines(&decoder, scanlines, 1);

    const uint8_t *src = scanlines[0];
    uint8_t *dst = data + row * width * 4;

    for (int x = 0; x < width; x++) {
      dst[x * 4 + 0] = src[x * channels + 0];
      dst[x * 4 + 1] = src[x * channels + 1];
      dst[x * 4 + 2] = src[x * channels + 2];
      dst[x * 4 + 3] = 255;
    }

    row++;
  }

  jpeg_finish_decompress(&decoder);
  jpeg_destroy_decompress(&decoder);

  return result;
}

static js_value_t *
bare_jpeg_encode(js_env_t *env, js_callback_info_t *info) {
  int err;

  size_t argc = 4;
  js_value_t *argv[4];

  err = js_get_callback_info(env, info, &argc, argv, NULL, NULL);
  assert(err == 0);

  assert(argc == 4);

  void *data;
  err = js_get_typedarray_info(env, argv[0], NULL, &data, NULL, NULL, NULL);
  assert(err == 0);

  int64_t width;
  err = js_get_value_int64(env, argv[1], &width);
  assert(err == 0);

  int64_t height;
  err = js_get_value_int64(env, argv[2], &height);
  assert(err == 0);

  int64_t quality;
  err = js_get_value_int64(env, argv[3], &quality);
  assert(err == 0);

  bare_jpeg_error_t error;

  struct jpeg_compress_struct encoder;

  encoder.err = jpeg_std_error(&error.handle);

  jpeg_create_compress(&encoder);

  utf8_t *jpeg = NULL;
  unsigned long *len = 0;
  jpeg_mem_dest(&encoder, &jpeg, &len);

  encoder.image_width = width;
  encoder.image_height = height;
  encoder.input_components = 3;
  encoder.in_color_space = JCS_RGB;

  jpeg_set_defaults(&encoder);
  jpeg_set_quality(&encoder, quality, true);

  error.handle.error_exit = bare_jpeg__on_error_exit;
  error.handle.emit_message = bare_jpeg__on_emit_message;

  if (setjmp(error.jump)) {
  err:
    err = js_throw_error(env, NULL, error.message);
    assert(err == 0);

    jpeg_destroy_compress(&encoder);

    return NULL;
  }

  jpeg_start_compress(&encoder, true);

  utf8_t *dst = malloc(width * 3);

  while (encoder.next_scanline < encoder.image_height) {
    const utf8_t *src = data + encoder.next_scanline * width * 4;

    for (int x = 0; x < width; x++) {
      dst[x * 3 + 0] = src[x * 4 + 0];
      dst[x * 3 + 1] = src[x * 4 + 1];
      dst[x * 3 + 2] = src[x * 4 + 2];
    }

    jpeg_write_scanlines(&encoder, &dst, 1);
  }

  free(dst);

  jpeg_finish_compress(&encoder);
  jpeg_destroy_compress(&encoder);

  js_value_t *result;
  err = js_create_external_arraybuffer(env, jpeg, len, bare_jpeg__on_finalize, NULL, &result);
  assert(err == 0);

  return result;
}

static js_value_t *
bare_jpeg_exports(js_env_t *env, js_value_t *exports) {
  int err;

#define V(name, fn) \
  { \
    js_value_t *val; \
    err = js_create_function(env, name, -1, fn, NULL, &val); \
    assert(err == 0); \
    err = js_set_named_property(env, exports, name, val); \
    assert(err == 0); \
  }

  V("decode", bare_jpeg_decode)
  V("encode", bare_jpeg_encode)
#undef V

  return exports;
}

BARE_MODULE(bare_jpeg, bare_jpeg_exports)
