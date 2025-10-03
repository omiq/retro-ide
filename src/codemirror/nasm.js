// NASM (Netwide Assembler) syntax highlighting mode for CodeMirror
// Based on the existing assembly modes but tailored for NASM syntax

CodeMirror.defineMode("nasm", function() {
  var keywords = {
    // NASM instruction set
    "mov": "keyword", "add": "keyword", "sub": "keyword", "mul": "keyword", "div": "keyword",
    "inc": "keyword", "dec": "keyword", "cmp": "keyword", "test": "keyword",
    "jmp": "keyword", "je": "keyword", "jne": "keyword", "jz": "keyword", "jnz": "keyword",
    "jl": "keyword", "jle": "keyword", "jg": "keyword", "jge": "keyword",
    "ja": "keyword", "jae": "keyword", "jb": "keyword", "jbe": "keyword",
    "call": "keyword", "ret": "keyword", "push": "keyword", "pop": "keyword",
    "int": "keyword", "iret": "keyword", "cli": "keyword", "sti": "keyword",
    "and": "keyword", "or": "keyword", "xor": "keyword", "not": "keyword",
    "shl": "keyword", "shr": "keyword", "rol": "keyword", "ror": "keyword",
    "loop": "keyword", "loope": "keyword", "loopne": "keyword",
    "rep": "keyword", "repe": "keyword", "repne": "keyword",
    "lodsb": "keyword", "lodsw": "keyword", "lodsd": "keyword",
    "stosb": "keyword", "stosw": "keyword", "stosd": "keyword",
    "movsb": "keyword", "movsw": "keyword", "movsd": "keyword",
    "cmpsb": "keyword", "cmpsw": "keyword", "cmpsd": "keyword",
    "scasb": "keyword", "scasw": "keyword", "scasd": "keyword",
    "in": "keyword", "out": "keyword", "hlt": "keyword", "nop": "keyword",
    
    // NASM directives
    "section": "keyword", "segment": "keyword", "org": "keyword",
    "db": "keyword", "dw": "keyword", "dd": "keyword", "dq": "keyword", "dt": "keyword",
    "resb": "keyword", "resw": "keyword", "resd": "keyword", "resq": "keyword", "rest": "keyword",
    "times": "keyword", "equ": "keyword", "equ": "keyword", "equ": "keyword",
    "global": "keyword", "extern": "keyword", "public": "keyword",
    "bits": "keyword", "use16": "keyword", "use32": "keyword",
    "align": "keyword", "alignb": "keyword",
    "incbin": "keyword", "incdir": "keyword", "include": "keyword",
    "%define": "keyword", "%undef": "keyword", "%ifdef": "keyword", "%ifndef": "keyword",
    "%if": "keyword", "%elif": "keyword", "%else": "keyword", "%endif": "keyword",
    "%macro": "keyword", "%endmacro": "keyword", "%rep": "keyword", "%endrep": "keyword",
    "%assign": "keyword", "%strlen": "keyword", "%substr": "keyword",
    
    // Registers
    "eax": "variable", "ebx": "variable", "ecx": "variable", "edx": "variable",
    "esi": "variable", "edi": "variable", "esp": "variable", "ebp": "variable",
    "ax": "variable", "bx": "variable", "cx": "variable", "dx": "variable",
    "si": "variable", "di": "variable", "sp": "variable", "bp": "variable",
    "al": "variable", "bl": "variable", "cl": "variable", "dl": "variable",
    "ah": "variable", "bh": "variable", "ch": "variable", "dh": "variable",
    "cs": "variable", "ds": "variable", "es": "variable", "fs": "variable",
    "gs": "variable", "ss": "variable",
    "cr0": "variable", "cr1": "variable", "cr2": "variable", "cr3": "variable",
    "dr0": "variable", "dr1": "variable", "dr2": "variable", "dr3": "variable",
    "dr6": "variable", "dr7": "variable",
    "tr3": "variable", "tr4": "variable", "tr5": "variable", "tr6": "variable", "tr7": "variable"
  };

  function tokenBase(stream, state) {
    var ch = stream.next();
    
    // Handle comments
    if (ch === ';') {
      stream.skipToEnd();
      return 'comment';
    }
    
    // Handle strings
    if (ch === '"' || ch === "'") {
      state.tokenize = tokenString(ch);
      return state.tokenize(stream, state);
    }
    
    // Handle numbers
    if (/\d/.test(ch)) {
      stream.eatWhile(/[\w\.]/);
      return 'number';
    }
    
    // Handle identifiers and keywords
    if (/[a-zA-Z_$]/.test(ch)) {
      stream.eatWhile(/[\w$]/);
      var word = stream.current();
      return keywords.hasOwnProperty(word.toLowerCase()) ? keywords[word.toLowerCase()] : 'variable';
    }
    
    // Handle operators and punctuation
    if (/[+\-*\/%=<>!&|^~]/.test(ch)) {
      return 'operator';
    }
    
    // Handle brackets and parentheses
    if (/[\[\]{}()]/.test(ch)) {
      return 'bracket';
    }
    
    return null;
  }

  function tokenString(quote) {
    return function(stream, state) {
      var escaped = false, next, end = false;
      while ((next = stream.next()) != null) {
        if (next === quote && !escaped) {
          end = true;
          break;
        }
        escaped = !escaped && next === '\\';
      }
      if (end || !(escaped || quote === '"')) {
        state.tokenize = null;
      }
      return 'string';
    };
  }

  return {
    startState: function() {
      return {tokenize: null};
    },
    token: function(stream, state) {
      if (stream.eatSpace()) return null;
      var style = (state.tokenize || tokenBase)(stream, state);
      return style;
    }
  };
});

CodeMirror.defineMIME("text/x-nasm", "nasm");
