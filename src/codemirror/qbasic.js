// CodeMirror, copyright (c) by Marijn Haverbeke and others
// Distributed under an MIT license: http://codemirror.net/LICENSE

(function(mod) {
  if (typeof exports == "object" && typeof module == "object") // CommonJS
    mod(require("../../lib/codemirror"));
  else if (typeof define == "function" && define.amd) // AMD
    define(["../../lib/codemirror"], mod);
  else // Plain browser env
    mod(CodeMirror);
})(function(CodeMirror) {
"use strict";

CodeMirror.defineMode("qbasic", function(conf, parserConf) {
    var ERRORCLASS = 'error';

    function wordRegexp(words, crunch) {
        return new RegExp("^((" + words.join(")|(") + "))\\b", "i");
    }

    var singleOperators = new RegExp("^[\\+\\-\\*/%&\\\\|\\^~<>!]");
    var singleDelimiters = new RegExp('^[\\(\\)\\[\\]\\{\\}@,:`=;\\.]');
    var doubleOperators = new RegExp("^((==)|(<>)|(<=)|(>=)|(<>)|(<<)|(>>)|(//)|(\\*\\*))");
    var doubleDelimiters = new RegExp("^((\\+=)|(\\-=)|(\\*=)|(%=)|(/=)|(&=)|(\\|=)|(\\^=))");
    var tripleDelimiters = new RegExp("^((//=)|(>>=)|(<<=)|(\\*\\*=))");
    var identifiers = new RegExp("^[_A-Za-z][_A-Za-z0-9]*");

    var openingKeywords = ['if','for','while','do','select','function','sub'];
    var middleKeywords = ['to','then','else','case','elseif'];
    var endKeywords = ['next','end','wend','loop','end if','end select','end function','end sub'];

    var operatorKeywords = ['and', 'or', 'not', 'xor', 'eqv', 'imp', 'mod'];
    var wordOperators = wordRegexp(operatorKeywords);
    
    // QBASIC specific keywords
    var qbasicKeywords = [
        // Control flow
        'IF','THEN','ELSE','ELSEIF','END','IF','FOR','NEXT','WHILE','WEND','DO','LOOP','UNTIL','SELECT','CASE','GOTO','GOSUB','RETURN',
        // Data types and variables
        'DIM','AS','INTEGER','LONG','SINGLE','DOUBLE','STRING','TYPE','END','TYPE','CONST','STATIC','SHARED',
        // I/O and system
        'PRINT','INPUT','LINE','INPUT','CLS','LOCATE','COLOR','SCREEN','WIDTH','HEIGHT','OPEN','CLOSE','GET','PUT',
        'SEEK','LOF','EOF','FREEFILE','KILL','NAME','MKDIR','RMDIR','CHDIR','SHELL','SYSTEM','END',
        // Graphics
        'PSET','LINE','CIRCLE','PAINT','DRAW','GET','PUT','SCREEN','COLOR','PALETTE','VIEW','WINDOW',
        // Sound
        'SOUND','PLAY','BEEP',
        // String functions
        'LEN','LEFT$','RIGHT$','MID$','INSTR','LCASE$','UCASE$','LTRIM$','RTRIM$','SPACE$','STRING$',
        // Math functions
        'ABS','SGN','INT','FIX','CINT','CLNG','CSNG','CDBL','SQR','EXP','LOG','SIN','COS','TAN','ATN',
        'RND','RANDOMIZE','TIMER','DATE$','TIME$',
        // File operations
        'OPEN','CLOSE','INPUT','PRINT','WRITE','GET','PUT','SEEK','LOF','EOF','FREEFILE',
        // Other
        'REM','LET','CALL','DEF','FN','ON','ERROR','RESUME','ERL','ERR','STOP','SLEEP','WAIT',
        'DATA','READ','RESTORE','SWAP','ERASE','REDIM','OPTION','BASE','EXPLICIT'
    ];
    
    var keywords = wordRegexp(qbasicKeywords);
    var stringPrefixes = '"';

    var opening = wordRegexp(openingKeywords);
    var middle = wordRegexp(middleKeywords);
    var closing = wordRegexp(endKeywords);
    var doubleClosing = wordRegexp(['end']);
    var doOpening = wordRegexp(['do']);

    var indentInfo = null;

    CodeMirror.registerHelper("hintWords", "qbasic", openingKeywords.concat(middleKeywords).concat(endKeywords)
                                .concat(operatorKeywords).concat(qbasicKeywords));

    function indent(_stream, state) {
      state.currentIndent++;
    }

    function dedent(_stream, state) {
      state.currentIndent--;
    }
    
    // tokenizers
    function tokenBase(stream, state) {
        if (stream.eatSpace()) {
            return null;
        }

        var ch = stream.peek();

        // Handle Comments
        if (ch === "'" || ch === "REM") {
            if (ch === "'") {
                stream.skipToEnd();
                return 'comment';
            } else if (stream.match(/^REM\b/i)) {
                stream.skipToEnd();
                return 'comment';
            }
        }

        // Handle Number Literals
        if (stream.match(/^(\$|&H|&O)?[0-9\.a-f]/i, false)) {
            var floatLiteral = false;
            // Floats
            if (stream.match(/^\d*\.\d+[!#]?/i)) { floatLiteral = true; }
            else if (stream.match(/^\d+\.\d*[!#]?/)) { floatLiteral = true; }
            else if (stream.match(/^\.\d+[!#]?/)) { floatLiteral = true; }

            if (floatLiteral) {
                return 'number';
            }
            // Integers
            var intLiteral = false;
            // Hex
            if (stream.match(/^&H[0-9a-f]+/i)) { intLiteral = true; }
            // Octal
            else if (stream.match(/^&O[0-7]+/i)) { intLiteral = true; }
            // Decimal
            else if (stream.match(/^\d+[%&!#]?/)) {
                intLiteral = true;
            }
            // Zero by itself with no other piece of number.
            else if (stream.match(/^0(?![\dx])/i)) { intLiteral = true; }
            if (intLiteral) {
                return 'number';
            }
        }

        // Handle Strings
        if (stream.match(stringPrefixes)) {
            state.tokenize = tokenStringFactory(stream.current());
            return state.tokenize(stream, state);
        }

        // Handle operators and Delimiters
        if (stream.match(tripleDelimiters) || stream.match(doubleDelimiters)) {
            return null;
        }
        if (stream.match(doubleOperators)
            || stream.match(singleOperators)
            || stream.match(wordOperators)) {
            return 'operator';
        }
        if (stream.match(singleDelimiters)) {
            return null;
        }
        if (stream.match(doOpening)) {
            indent(stream,state);
            state.doInCurrentLine = true;
            return 'keyword';
        }
        if (stream.match(opening)) {
            if (! state.doInCurrentLine)
              indent(stream,state);
            else
              state.doInCurrentLine = false;
            return 'keyword';
        }
        if (stream.match(middle)) {
            return 'keyword';
        }

        if (stream.match(doubleClosing)) {
            dedent(stream,state);
            dedent(stream,state);
            return 'keyword';
        }
        if (stream.match(closing)) {
            dedent(stream,state);
            return 'keyword';
        }

        if (stream.match(keywords)) {
            return 'keyword';
        }

        if (stream.match(identifiers)) {
            return 'variable';
        }

        // Handle non-detected items
        stream.next();
        return ERRORCLASS;
    }

    function tokenStringFactory(delimiter) {
        var singleline = delimiter.length == 1;
        var OUTCLASS = 'string';

        return function(stream, state) {
            while (!stream.eol()) {
                stream.eatWhile(/[^'"]/);
                if (stream.match(delimiter)) {
                    state.tokenize = tokenBase;
                    return OUTCLASS;
                } else {
                    stream.eat(/['"]/);
                }
            }
            if (singleline) {
                if (parserConf.singleLineStringErrors) {
                    return ERRORCLASS;
                } else {
                    state.tokenize = tokenBase;
                }
            }
            return OUTCLASS;
        };
    }

    function tokenLexer(stream, state) {
        var style = state.tokenize(stream, state);
        var current = stream.current();

        // Handle '.' connected identifiers
        if (current === '.') {
            style = state.tokenize(stream, state);
            if (style === 'variable') {
                return 'variable';
            } else {
                return ERRORCLASS;
            }
        }

        var delimiter_index = '[({'.indexOf(current);
        if (delimiter_index !== -1) {
            indent(stream, state );
        }
        if (indentInfo === 'dedent') {
            if (dedent(stream, state)) {
                return ERRORCLASS;
            }
        }
        delimiter_index = '])}'.indexOf(current);
        if (delimiter_index !== -1) {
            if (dedent(stream, state)) {
                return ERRORCLASS;
            }
        }

        return style;
    }

    var external = {
        startState: function() {
            return {
              tokenize: tokenBase,
              lastToken: null,
              currentIndent: 0,
              nextLineIndent: 0,
              doInCurrentLine: false
          };
        },

        token: function(stream, state) {
            if (stream.sol()) {
              state.currentIndent += state.nextLineIndent;
              state.nextLineIndent = 0;
              state.doInCurrentLine = 0;
            }
            var style = tokenLexer(stream, state);

            state.lastToken = {style:style, content: stream.current()};

            return style;
        },

        lineComment: "'"
    };
    return external;
});

CodeMirror.defineMIME("text/x-qbasic", "qbasic");

});
