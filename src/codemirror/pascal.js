// CodeMirror mode for Pascal/Turbo Pascal
// Based on the existing basic.js mode but adapted for Pascal syntax

CodeMirror.defineMode("pascal", function() {
  var keywords = {
    "program": "keyword", "procedure": "keyword", "function": "keyword", "begin": "keyword", "end": "keyword",
    "var": "keyword", "const": "keyword", "type": "keyword", "array": "keyword", "of": "keyword",
    "if": "keyword", "then": "keyword", "else": "keyword", "while": "keyword", "do": "keyword",
    "for": "keyword", "to": "keyword", "downto": "keyword", "repeat": "keyword", "until": "keyword",
    "case": "keyword", "goto": "keyword", "with": "keyword", "record": "keyword", "set": "keyword",
    "file": "keyword", "packed": "keyword", "nil": "keyword", "in": "keyword", "not": "keyword",
    "and": "keyword", "or": "keyword", "xor": "keyword", "div": "keyword", "mod": "keyword",
    "integer": "type", "real": "type", "boolean": "type", "char": "type", "string": "type",
    "byte": "type", "word": "type", "longint": "type", "single": "type", "double": "type",
    "extended": "type", "comp": "type", "pointer": "type", "text": "type",
    "true": "atom", "false": "atom", "maxint": "atom", "pi": "atom",
    "writeln": "builtin", "write": "builtin", "readln": "builtin", "read": "builtin",
    "halt": "builtin", "exit": "builtin", "break": "builtin", "continue": "builtin",
    "abs": "builtin", "sqr": "builtin", "sqrt": "builtin", "sin": "builtin", "cos": "builtin",
    "arctan": "builtin", "ln": "builtin", "exp": "builtin", "trunc": "builtin", "round": "builtin",
    "ord": "builtin", "chr": "builtin", "pred": "builtin", "succ": "builtin", "odd": "builtin",
    "eof": "builtin", "eoln": "builtin", "length": "builtin", "pos": "builtin", "copy": "builtin",
    "delete": "builtin", "insert": "builtin", "str": "builtin", "val": "builtin",
    "clrscr": "builtin", "gotoxy": "builtin", "wherex": "builtin", "wherey": "builtin",
    "textcolor": "builtin", "textbackground": "builtin", "window": "builtin",
    "random": "builtin", "randomize": "builtin", "delay": "builtin", "sound": "builtin", "nosound": "builtin"
  };

  function tokenBase(stream, state) {
    var ch = stream.next();
    
    if (ch === '"' || ch === "'") {
      state.tokenize = tokenString(ch);
      return state.tokenize(stream, state);
    }
    
    if (ch === '{') {
      state.tokenize = tokenComment;
      return tokenComment(stream, state);
    }
    
    if (ch === '(' && stream.peek() === '*') {
      stream.next();
      state.tokenize = tokenCommentBlock;
      return tokenCommentBlock(stream, state);
    }
    
    if (/\d/.test(ch)) {
      stream.eatWhile(/[\w\.]/);
      return "number";
    }
    
    if (/[a-zA-Z_]/.test(ch)) {
      stream.eatWhile(/[\w_]/);
      var cur = stream.current();
      return keywords.hasOwnProperty(cur.toLowerCase()) ? keywords[cur.toLowerCase()] : "variable";
    }
    
    if (ch === ';') {
      return "operator";
    }
    
    if (/[+\-*\/=<>!&|]/.test(ch)) {
      stream.eatWhile(/[+\-*\/=<>!&|]/);
      return "operator";
    }
    
    if (/[\[\]{}()]/.test(ch)) {
      return "bracket";
    }
    
    if (ch === ':') {
      if (stream.peek() === '=') {
        stream.next();
        return "operator";
      }
      return "operator";
    }
    
    if (ch === '.') {
      if (stream.eat('.')) {
        return "operator";
      }
      return "operator";
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
      return "string";
    };
  }

  function tokenComment(stream, state) {
    var maybeEnd = false, ch;
    while (ch = stream.next()) {
      if (ch === '}' && maybeEnd) {
        state.tokenize = null;
        break;
      }
      maybeEnd = (ch === '*');
    }
    return "comment";
  }

  function tokenCommentBlock(stream, state) {
    var maybeEnd = false, ch;
    while (ch = stream.next()) {
      if (ch === ')' && maybeEnd) {
        state.tokenize = null;
        break;
      }
      maybeEnd = (ch === '*');
    }
    return "comment";
  }

  return {
    startState: function() {
      return {tokenize: null};
    },
    token: function(stream, state) {
      if (stream.eatSpace()) return null;
      return tokenBase(stream, state);
    }
  };
});

CodeMirror.defineMIME("text/x-pascal", "pascal");
