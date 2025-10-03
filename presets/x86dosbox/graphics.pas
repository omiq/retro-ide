program GraphicsDemo;
uses crt, graph;

var
    gd, gm: integer;
    i: integer;

begin
    gd := detect;
    initgraph(gd, gm, '');
    
    if graphresult <> grok then
    begin
        writeln('Graphics error: ', grapherrormsg(graphresult));
        halt(1);
    end;
    
    writeln('Turbo Pascal Graphics Demo');
    writeln('Drawing colorful shapes...');
    
    { Draw some colorful shapes }
    setcolor(1); { Blue }
    circle(100, 100, 50);
    
    setcolor(2); { Green }
    rectangle(200, 50, 300, 150);
    
    setcolor(4); { Red }
    line(50, 200, 150, 200);
    
    setcolor(14); { Yellow }
    setfillstyle(1, 14);
    bar(250, 200, 350, 300);
    
    { Draw some text }
    setcolor(15); { White }
    settextstyle(0, 0, 2);
    outtextxy(50, 350, 'Turbo Pascal Graphics!');
    
    { Wait for key press }
    readln;
    closegraph;
end.
