10 REM BBC BASIC: Text formatting, colours, and control codes
20 MODE 7:CLS
30 PRINT CHR$141"BBC BASIC Text Formatting"
40 PRINT CHR$141"BBC BASIC Text Formatting"
30 PRINT 
40 PRINT STRING$(30,"=")
50 PRINT CHR$132;CHR$157;CHR$131"Yellow text on blue background"
60 PRINT "Normal text"
70 PRINT CHR$(129);"Red text ";CHR$(135);"/ White again"
80 PRINT CHR$(132);"Green ";CHR$(135);" ";CHR$(131);"Yellow"
90 PRINT CHR$133;" Magenta text "; CHR$134;" Cyan text "; CHR$130;" Green text"
100 PRINT "Tabbed:";TAB(20);"Aligned at column 20"
110 PRINT "Mixed";TAB(10);"columns";TAB(30);"demo"
120 PRINT
130 PRINT "Box made from ASCII characters:"
140 PRINT CHR$(43);STRING$(30,"-");CHR$(43)
150 FOR R=1 TO 3: PRINT CHR$(124);SPC(30);CHR$(124): NEXT
160 PRINT CHR$(43);STRING$(30,"-");CHR$(43)
170 PRINT "A red box:"CHR$145;CHR$247;CHR$251
180 PRINT CHR$136"Some flashing text"
170 PRINT
180 PRINT "Press any key to continue...";:A$=GET$