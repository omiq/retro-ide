import { getBasePlatform } from "../../common/util";
import { BuildStep, populateFiles, populateExtraFiles, errorResult, processEmbedDirective } from "../builder";
import { makeErrorMatcher, extractErrors } from "../listingutils";
import { PLATFORM_PARAMS } from "../platforms";
import { load, print_fn, setupFS, execMain, emglobal, EmscriptenModule } from "../wasmutils";

function makeCPPSafe(s: string): string {
    return s.replace(/[^A-Za-z0-9_]/g, '_');
}

export function preprocessMCPP(step: BuildStep, filesys: string) {
    load("mcpp");
    var platform = step.platform;
    var params = PLATFORM_PARAMS[getBasePlatform(platform)];
    if (!params) throw Error("Platform not supported: " + platform);
    // <stdin>:2: error: Can't open include file "foo.h"
    var errors = [];
    var match_fn = makeErrorMatcher(errors, /<stdin>:(\d+): (.+)/, 1, 2, step.path);
    var MCPP: EmscriptenModule = emglobal.mcpp({
        noInitialRun: true,
        noFSInit: true,
        print: print_fn,
        printErr: match_fn,
    });
    var FS = MCPP.FS;
    if (filesys) setupFS(FS, filesys);
    populateFiles(step, FS, {
        mainFilePath: step.path,
        processFn: (path, code) => {
            if (typeof code === 'string') {
                code = processEmbedDirective(code);
            }
            return code;
        }
    });
    populateExtraFiles(step, FS, params.extra_compile_files);
    
    // Add standard library headers for x86 platform (SmallerC)
    if (platform === 'x86') {
        try {
            FS.mkdir('/share');
            FS.mkdir('/share/include');
        } catch (e) {
            // Directory might already exist
        }
        
        // Add standard C library headers
        var stdHeaders = {
            'stdarg.h': `#ifndef __STDARG_H
#define __STDARG_H

typedef char* va_list;

#define va_start(ap, param) (ap = (va_list)&param + sizeof(param))
#define va_arg(ap, type) (*(type*)((ap += sizeof(type)) - sizeof(type)))
#define va_end(ap) (ap = (va_list)0)

#endif
`,
            'stdio.h': `/*
  Copyright (c) 2014, Alexey Frunze
  2-clause BSD license.
*/
#ifndef __STDIO_H
#define __STDIO_H

#include <stdarg.h>

#ifndef NULL
#define NULL 0
#endif

#ifndef __SIZE_T_DEF
#define __SIZE_T_DEF
typedef unsigned size_t;
#endif

#define EOF (-1)

#ifndef SEEK_SET
#define SEEK_SET 0
#endif
#ifndef SEEK_CUR
#define SEEK_CUR 1
#endif
#ifndef SEEK_END
#define SEEK_END 2
#endif

#ifndef __FPOS_T_DEF
#define __FPOS_T_DEF
typedef struct
{
  unsigned short halves[2];
} fpos_t;
#endif

typedef struct __stream FILE;

extern FILE *__stdin, *__stdout, *__stderr;
#define stdin  __stdin
#define stdout __stdout
#define stderr __stderr

#define _IOFBF 01
#define _IONBF 02
#define _IOLBF 04

#define BUFSIZ 1024

#ifdef _DOS
#define FOPEN_MAX 20
#define FILENAME_MAX 80
#define L_tmpnam 80
#define TMP_MAX 10000
#endif

#ifdef _WINDOWS
#define FOPEN_MAX 20
#define FILENAME_MAX 260
#define L_tmpnam 260
#define TMP_MAX 10000
#endif

#ifdef _LINUX
#define FOPEN_MAX 20
#define FILENAME_MAX 4096
#define L_tmpnam 20
#define TMP_MAX 10000
#endif

#ifdef _MACOS
#define FOPEN_MAX 20
#define FILENAME_MAX 4096
#define L_tmpnam 20
#define TMP_MAX 10000
#endif

FILE* fopen(char*, char*);
FILE* freopen(char*, char*, FILE*);
int fflush(FILE*);
int fclose(FILE*);
int remove(char*);
int rename(char*, char*);
size_t fread(void*, size_t, size_t, FILE*);
int fgetc(FILE*);
int getc(FILE*);
int getchar(void);
char* fgets(char*, int, FILE*);
char* gets(char*);
int ungetc(int, FILE*);
size_t fwrite(void*, size_t, size_t, FILE*);
int fputc(int, FILE*);
int putc(int, FILE*);
int putchar(int);
int fputs(char*, FILE*);
int puts(char*);
void perror(char*);
#ifdef __SMALLER_C_32__
long ftell(FILE*);
int fseek(FILE*, long, int);
#endif
int/*0 on success,-1 on failure*/ __ftell(FILE*, fpos_t*/*position out*/);
int __fseek(FILE*, fpos_t*/*position in*/, int/*whence*/);
void rewind(FILE*);
int fgetpos(FILE*, fpos_t*);
int fsetpos(FILE*, fpos_t*);
void clearerr(FILE*);
int ferror(FILE*);
int feof(FILE*);
int setvbuf(FILE*, char*, int, size_t);
void setbuf(FILE*, char*);
int __fileno(FILE*);
int fileno(FILE*);
char* tmpnam(char*);
FILE* tmpfile(void);

int vfprintf(FILE*, char*, va_list);
int fprintf(FILE*, char*, ...);
int vprintf(char*, va_list);
int printf(char*, ...);
int vsprintf(char*, char*, va_list);
int sprintf(char*, char*, ...);
int vsnprintf(char*, size_t, char*, va_list);
int snprintf(char*, size_t, char*, ...);

int vfscanf(FILE*, char*, va_list);
int fscanf(FILE*, char*, ...);
int vscanf(char*, va_list);
int scanf(char*, ...);
int vsscanf(char*, char*, va_list);
int sscanf(char*, char*, ...);

#endif
`,
            'stdlib.h': `#ifndef _STDLIB_H
#define _STDLIB_H

#define NULL ((void*)0)
#define EXIT_SUCCESS 0
#define EXIT_FAILURE 1

typedef unsigned int size_t;

void *malloc(size_t size);
void *calloc(size_t num, size_t size);
void *realloc(void *ptr, size_t size);
void free(void *ptr);
void exit(int status);
void abort(void);
int atoi(const char *str);
long atol(const char *str);
double atof(const char *str);
int rand(void);
void srand(unsigned int seed);
int abs(int x);
long labs(long x);
void qsort(void *base, size_t num, size_t size, int (*compar)(const void*, const void*));
void *bsearch(const void *key, const void *base, size_t num, size_t size, int (*compar)(const void*, const void*));

#endif
`,
            'string.h': `#ifndef _STRING_H
#define _STRING_H

typedef unsigned int size_t;

void *memcpy(void *dest, const void *src, size_t n);
void *memmove(void *dest, const void *src, size_t n);
void *memset(void *s, int c, size_t n);
int memcmp(const void *s1, const void *s2, size_t n);
void *memchr(const void *s, int c, size_t n);
char *strcpy(char *dest, const char *src);
char *strncpy(char *dest, const char *src, size_t n);
char *strcat(char *dest, const char *src);
char *strncat(char *dest, const char *src, size_t n);
int strcmp(const char *s1, const char *s2);
int strncmp(const char *s1, const char *s2, size_t n);
char *strchr(const char *s, int c);
char *strrchr(const char *s, int c);
char *strstr(const char *haystack, const char *needle);
size_t strlen(const char *s);
size_t strspn(const char *s, const char *accept);
size_t strcspn(const char *s, const char *reject);
char *strpbrk(const char *s, const char *accept);
char *strtok(char *str, const char *delim);

#endif
`,
            'ctype.h': `#ifndef _CTYPE_H
#define _CTYPE_H

int isalnum(int c);
int isalpha(int c);
int iscntrl(int c);
int isdigit(int c);
int isgraph(int c);
int islower(int c);
int isprint(int c);
int ispunct(int c);
int isspace(int c);
int isupper(int c);
int isxdigit(int c);
int tolower(int c);
int toupper(int c);

#endif
`,
            'stddef.h': `#ifndef _STDDEF_H
#define _STDDEF_H

#define NULL ((void*)0)
typedef unsigned int size_t;
typedef int ptrdiff_t;
typedef unsigned int wchar_t;

#define offsetof(type, member) ((size_t)&(((type*)0)->member))

#endif
`,
            'limits.h': `#ifndef _LIMITS_H
#define _LIMITS_H

#define CHAR_BIT 8
#define SCHAR_MIN (-128)
#define SCHAR_MAX 127
#define UCHAR_MAX 255
#define CHAR_MIN SCHAR_MIN
#define CHAR_MAX SCHAR_MAX
#define SHRT_MIN (-32768)
#define SHRT_MAX 32767
#define USHRT_MAX 65535
#define INT_MIN (-2147483648)
#define INT_MAX 2147483647
#define UINT_MAX 4294967295U
#define LONG_MIN (-2147483648L)
#define LONG_MAX 2147483647L
#define ULONG_MAX 4294967295UL

#endif
`,
            'float.h': `#ifndef _FLOAT_H
#define _FLOAT_H

#define FLT_RADIX 2
#define FLT_MANT_DIG 24
#define FLT_DIG 6
#define FLT_MIN_EXP (-125)
#define FLT_MAX_EXP 128
#define FLT_MIN 1.175494e-38F
#define FLT_MAX 3.402823e+38F
#define FLT_EPSILON 1.192093e-07F

#define DBL_MANT_DIG 53
#define DBL_DIG 15
#define DBL_MIN_EXP (-1021)
#define DBL_MAX_EXP 1024
#define DBL_MIN 2.225074e-308
#define DBL_MAX 1.797693e+308
#define DBL_EPSILON 2.220446e-16

#endif
`,
            'assert.h': `#ifndef _ASSERT_H
#define _ASSERT_H

#ifdef NDEBUG
#define assert(expr) ((void)0)
#else
#define assert(expr) ((expr) ? (void)0 : __assert_fail(#expr, __FILE__, __LINE__, __func__))
#endif

void __assert_fail(const char *assertion, const char *file, unsigned int line, const char *function);

#endif
`,
            'errno.h': `#ifndef _ERRNO_H
#define _ERRNO_H

extern int errno;

#define ENOENT 2
#define EIO 5
#define ENOMEM 12
#define EACCES 13
#define EEXIST 17
#define ENOTDIR 20
#define EISDIR 21
#define EINVAL 22

#endif
`,
            'math.h': `#ifndef _MATH_H
#define _MATH_H

#define M_E 2.7182818284590452354
#define M_LOG2E 1.4426950408889634074
#define M_LOG10E 0.43429448190325182765
#define M_LN2 0.69314718055994530942
#define M_LN10 2.30258509299404568402
#define M_PI 3.14159265358979323846
#define M_PI_2 1.57079632679489661923
#define M_PI_4 0.78539816339744830962
#define M_1_PI 0.31830988618379067154
#define M_2_PI 0.63661977236758134308
#define M_2_SQRTPI 1.12837916709551257390
#define M_SQRT2 1.41421356237309504880
#define M_SQRT1_2 0.70710678118654752440

double sin(double x);
double cos(double x);
double tan(double x);
double asin(double x);
double acos(double x);
double atan(double x);
double atan2(double y, double x);
double sinh(double x);
double cosh(double x);
double tanh(double x);
double exp(double x);
double log(double x);
double log10(double x);
double pow(double x, double y);
double sqrt(double x);
double ceil(double x);
double floor(double x);
double fabs(double x);
double fmod(double x, double y);

#endif
`
        };
        
        for (var header in stdHeaders) {
            try {
                FS.writeFile('/share/include/' + header, stdHeaders[header]);
            } catch (e) {
                console.log('Warning: Could not write header file', header, e);
            }
        }
    }
    // TODO: make configurable by other compilers
    var args = [
        "-D", "__8BITWORKSHOP__",
        "-D", "__SDCC_z80",
        "-D", makeCPPSafe(platform.toUpperCase()),
        "-I", "/share/include",
        "-Q",
        step.path, "main.i"];
    if (step.mainfile) {
        args.unshift.apply(args, ["-D", "__MAIN__"]);
    }
    let platform_def = (platform.toUpperCase() as any).replaceAll(/[^a-zA-Z0-9]/g, '_');
    args.unshift.apply(args, ["-D", `__PLATFORM_${platform_def}__`]);
    if (params.extra_preproc_args) {
        args.push.apply(args, params.extra_preproc_args);
    }
    execMain(step, MCPP, args);
    if (errors.length)
        return { errors: errors };
    var iout = FS.readFile("main.i", { encoding: 'utf8' });
    iout = iout.replace(/^#line /gm, '\n# ');
    try {
        var errout = FS.readFile("mcpp.err", { encoding: 'utf8' });
        if (errout.length) {
            // //main.c:2: error: Can't open include file "stdiosd.h"
            var errors = extractErrors(/([^:]+):(\d+): (.+)/, errout.split("\n"), step.path, 2, 3, 1);
            if (errors.length == 0) {
                errors = errorResult(errout).errors;
            }
            return { errors: errors };
        }
    } catch (e) {
        //
    }
    return { code: iout };
}