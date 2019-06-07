#include <node.h>
#include <nan.h>
#include <errno.h>
#include <string.h>

#include <sys/mman.h>  /* shm_open(), shm_unlink() */
#include <sys/stat.h>  /* for mode constants */
#include <sys/fcntl.h>  /* for O_* constants */

#include <unistd.h>  /* ftruncate() */
#include <sys/types.h>  /* types */

#define NAN_RETURN(X) info.GetReturnValue().Set(X)

using namespace v8;


const char* to_c_str(const String::Utf8Value& value) {
	return *value? *value: "<string conversion failed>";
}


#if (NODE_MODULE_VERSION < NODE_0_12_MODULE_VERSION)
NAN_INLINE v8::Local<v8::Value> NanThrowErrno(
	int errorno,
	const char *syscall = NULL,
	const char *msg = "",
	const char *path = NULL
) {
	do {
		Nan::HandleScope();
		return v8::Local<v8::Value>::New(node::ErrnoException(errorno, syscall, msg, path));
	} while (0);
}
#else
NAN_INLINE void NanThrowErrno(int errorno,
	const char *syscall = NULL,
	const char *msg = "",
	const char *path = NULL
) {
	do {
		Nan::HandleScope();
		v8::Isolate::GetCurrent()->ThrowException(node::ErrnoException(errorno, syscall, msg, path));
	} while (0);
}
#endif


NAN_METHOD(open) {
	if(info.Length() != 3
		|| !info[0]->IsString()
		|| !info[1]->IsUint32()
		|| !info[2]->IsUint32()
	) return Nan::ThrowError("open() expects 3 args: (name: string, open_flags: uint and mode: uint)");

	const int xm_flags = info[1]->Uint32Value();
	const mode_t x_mode = info[2]->Uint32Value();

	String::Utf8Value s_name(info[0]->ToString());
	const char* sc_name = to_c_str(s_name);

	int if_shm = shm_open(sc_name, xm_flags, x_mode);

	if(-1 == if_shm) return NanThrowErrno(errno, "shm_open", "failed to open memory segment");

	NAN_RETURN(if_shm);
}

NAN_METHOD(resize) {
	if(info.Length() != 2
		|| !info[0]->IsUint32()
		|| !info[1]->IsUint32()
	) return Nan::ThrowError("size() expects 2 args: (fd: uint, size: uint)");

	const int if_shm = info[0]->Uint32Value();
	const off_t nb_shm = info[1]->Uint32Value();

	int ib_truncate = ftruncate(if_shm, nb_shm);

	if(-1 == ib_truncate) return Nan::ThrowError("failed to truncate file");
}


NAN_METHOD(unlink) {
	if(info.Length() != 1
		|| !info[0]->IsString()
	) return Nan::ThrowError("unlink() expects 1 arg: (name: string)");

	String::Utf8Value s_name(info[0]->ToString());
	const char* sc_name = to_c_str(s_name);

	int ib_unlink = shm_unlink(sc_name);

	if(-1 == ib_unlink) return Nan::ThrowError("failed to unlink file");
}


NAN_MODULE_INIT(Init) {
	NAN_EXPORT(target, open);
	NAN_EXPORT(target, resize);
	NAN_EXPORT(target, unlink);

	NODE_DEFINE_CONSTANT(target, O_RDONLY);
	NODE_DEFINE_CONSTANT(target, O_RDWR);
	NODE_DEFINE_CONSTANT(target, O_CREAT);
	NODE_DEFINE_CONSTANT(target, O_EXCL);
	NODE_DEFINE_CONSTANT(target, O_TRUNC);
}

NODE_MODULE(shmmap, Init)
