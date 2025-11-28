graphicsbank:
ASM
    DEFB 060,126,219,255,255,255,219,219
END ASM

FUNCTION FUN(NUM as FLOAT)

   return NUM+1

END FUNCTION


SUB hello ()
   CLS
   POKE UINTEGER 23675, @graphicsbank
   PRINT CHR$(CODE "\a")	
   PRINT "Hello World!",FUN(1)

END SUB

hello()
