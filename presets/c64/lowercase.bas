10 rem lowercase basic demo
20 print "{clr}"
30 print "lowercase basic commands work!"
40 print
50 print "this program uses all lowercase:"
60 print "- rem (comments)"
70 print "- print (output)"
80 print "- input (user input)"
90 print "- if/then (conditionals)"
100 print "- goto/gosub (jumps)"
110 print "- return (subroutines)"
120 print "- end (program end)"
130 print
140 input "press enter to continue"; a$
150 if a$="" then goto demo
160 goto end

demo:
170 print
180 print "demo: gosub with lowercase commands"
190 gosub subroutine
200 print "back from subroutine"
210 goto end

subroutine:
220 print "  - this is a subroutine"
230 print "  - using lowercase commands"
240 return

end:
250 print
260 print "program complete!"
270 end
