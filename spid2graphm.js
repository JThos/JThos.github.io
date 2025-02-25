var maxH,maxW,xmlDoc,drawing,selectedElement,offset,transform,xml,selectedPaths,corrector=3.775,minTolerance=10,largo=3,factor=750,parser=new DOMParser,highlightedItem="",defaultPathLengthLimit=250,lengthExcededCount=0;let currentElement=null;var contextMenu=null,modal=null,propertiesTable=null,svg=document.getElementById("mysvg");let viewBox=[800,-0,1800,1800],isPanning=!1,startX,startY;var isolatedItemId="",downstreamNodeFilter="",downstreamEdgeFilter="[@Type='Piping' or @Type='DirectConnection']",upstreamNodeFilter="",upwnstreamEdgeFilter="[@Type='Piping' or @Type='DirectConnection']",isolateNodeFilter="/Data[contains(@Subtype,'valve') or @Type='Nozzle']",isolateEdgeFilter="[@Type='Piping' or @Type='DirectConnection']",listOfChildNozzles="";function makeDraggable(){(svg=document.getElementById("mysvg")).addEventListener("contextmenu",rightClick,!1),svg.addEventListener("mousedown",startDrag,!1),svg.addEventListener("mousemove",drag,!1),svg.addEventListener("mouseup",endDrag,!1),svg.addEventListener("wheel",t=>{t.preventDefault();let e=t.deltaY<0?.9090909090909091:1.1,r=t.clientX/window.innerWidth*viewBox[2]+viewBox[0],n=t.clientY/window.innerHeight*viewBox[3]+viewBox[1];viewBox[2]*=e,viewBox[3]*=e,viewBox[0]=r-(r-viewBox[0])*e,viewBox[1]=n-(n-viewBox[1])*e,svg.setAttribute("viewBox",viewBox.join(" "))})}function showMetadata(t){var e=[],r=xmlDoc.getElementById(t);if(null!=r){console.clear();var n=0;for(e.push({name:"Graph element",value:r.nodeName}),n=0;n<r.attributes.length;n++)e.push({name:r.attributes[n].nodeName,value:r.attributes[n].nodeValue.replaceAll("\\","\\\\")});var l=r.childNodes[0];for(n=0;n<l.attributes.length;n++){var a=l.attributes[n].nodeValue.replaceAll("\\","\\\\");a=a.replace('"','\\"'),e.push({name:l.attributes[n].nodeName,value:a})}}return e}function rightClick(t){t.preventDefault(),highlight(highlightedItem=t.target.getAttribute("id")),currentElement=t.target;let e=t.pageX,r=t.pageY,n=contextMenu.offsetWidth,l=contextMenu.offsetHeight;contextMenu.style.left=(e+n>window.innerWidth?window.innerWidth-n:e)+"px",contextMenu.style.top=(r+l>window.innerHeight?window.innerHeight-l:r)+"px",contextMenu.classList.add("show")}function startDrag(t){0==t.button?"mysvg"==t.target.getAttribute("id")?(isPanning=!0,startX=event.clientX,startY=event.clientY,svg.style.cursor="grabbing"):(highlightedItem&&(highlight(highlightedItem),highlightedItem=""),highlight(highlightedItem=t.target.getAttribute("id")),(t.target.classList.contains("draggable")||t.target.classList.contains("draggable_highlighted"))&&(selectedElement=t.target)):t.button}function drag(t){if(0==t.button){if("mysvg"==t.target.getAttribute("id")){if(!isPanning)return;let e=(event.clientX-startX)*(viewBox[2]/window.innerWidth),r=(event.clientY-startY)*(viewBox[3]/window.innerHeight);viewBox[0]-=e,viewBox[1]-=r,svg.setAttribute("viewBox",viewBox.join(" ")),startX=event.clientX,startY=event.clientY}else if(selectedElement&&"info"!=selectedElement){var n=oMousePosSVG(t);selectedElement.setAttribute("cx",parseInt(n.x)/corrector+"mm"),selectedElement.setAttribute("cy",parseInt(n.y)/corrector+"mm")}}}function endDrag(t){if("mysvg"==t.target.getAttribute("id"))isPanning=!1,(P=document.getElementById("mysvg")).style.cursor="grab";else if(selectedElement){if(0==t.button){var e=oMousePosSVG(t);selectedElement.setAttribute("cx",parseInt(e.x)/corrector+"mm"),selectedElement.setAttribute("cy",parseInt(e.y)/corrector+"mm");var r=null,n=null,l=null,a=null,o=xmlDoc.getElementsByTagName("Edge");for(i=0;i<o.length;i++){r=null,n=null,l=null,a=null;var d="";d="EndNode to StartNode"==o[i].getAttribute("FlowDir")?o[i].getAttribute("EndNode"):o[i].getAttribute("StartNode");var s=document.getElementById(o[i].id);d==selectedElement.id&&"OPC Pairing"!=o[i].childNodes[0].getAttribute("Type")&&null!=s&&(s.setAttribute("x1",selectedElement.getAttribute("cx")),s.setAttribute("y1",selectedElement.getAttribute("cy")),r=s.getAttribute("x1"),n=s.getAttribute("y1"),l=s.getAttribute("x2"),a=s.getAttribute("y2"));var g="";if((g="EndNode to StartNode"==o[i].getAttribute("FlowDir")?o[i].getAttribute("StartNode"):o[i].getAttribute("EndNode"))==selectedElement.id&&"OPC Pairing"!=o[i].childNodes[0].getAttribute("Type")&&null!=s&&(s.setAttribute("x2",selectedElement.getAttribute("cx")),s.setAttribute("y2",selectedElement.getAttribute("cy")),r=s.getAttribute("x1"),n=s.getAttribute("y1"),l=s.getAttribute("x2"),a=s.getAttribute("y2")),!(null==r||null==n||null==l||null==a)){var u=parseFloat(r.replace("mm","")),c=parseFloat(n.replace("mm","")),m=parseFloat(l.replace("mm","")),h=parseFloat(a.replace("mm","")),b=Math.atan((h-c)/(m-u)),p=(parseFloat(u)+parseFloat(m))/2,E=(parseFloat(c)+parseFloat(h))/2,A=m-u,x=h-c,y=document.getElementById("fd1_"+s.getAttribute("id")),f=document.getElementById("fd2_"+s.getAttribute("id"));if(Math.abs(A)<minTolerance&&Math.abs(x)<minTolerance)y.setAttribute("x1",p+"mm"),y.setAttribute("y1",E+"mm"),y.setAttribute("x2",p+"mm"),y.setAttribute("y2",E+"mm"),f.setAttribute("x1",p+"mm"),f.setAttribute("y1",E+"mm"),f.setAttribute("x2",p+"mm"),f.setAttribute("y2",E+"mm");else{var v,w,N=p+largo*Math.sin(b),$=E-largo*Math.cos(b);u<=m?(v=p+2*largo*Math.cos(b),w=E+2*largo*Math.sin(b)):(v=p-2*largo*Math.cos(b),w=E-2*largo*Math.sin(b)),y.setAttribute("x1",p+"mm"),y.setAttribute("y1",E+"mm"),y.setAttribute("x2",N+"mm"),y.setAttribute("y2",$+"mm"),f.setAttribute("x1",N+"mm"),f.setAttribute("y1",$+"mm"),f.setAttribute("x2",v+"mm"),f.setAttribute("y2",w+"mm")}}}selectedElement=!1}else if(2==t.button){var P=document.getElementById("mysvg"),D=document.getElementById("info");null!=D&&P.removeChild(D),selectedElement=!1}}}function GetElementsByAttribute(t,e,r){var n=Array.prototype.slice.call(xmlDoc.getElementsByTagName(t),0),l=function(t){return t.getAttribute(e)==r};return n.where(l)}function oMousePosSVG(t){var e=mysvg.createSVGPoint();e.x=t.clientX,e.y=t.clientY;var r=mysvg.getScreenCTM().inverse();return e.matrixTransform(r)}function FlowDirArrow(t,e,r,n,l,a,o){var d="";d=""==l||null==l?"FlowDirNotSetArrow":"StartNode to EndNode"==l||"EndNode to StartNode"==l?"FlowDirSetArrow":"FlowDirSetBiDirectional";var s=Math.atan((n-e)/(r-t)),g=(parseFloat(t)+parseFloat(r))/2,u=(parseFloat(e)+parseFloat(n))/2;if(Math.abs(r-t)<minTolerance&&Math.abs(n-e)<minTolerance){let c=document.createElementNS("http://www.w3.org/2000/svg","line");c.setAttribute("x1",g+"mm"),c.setAttribute("y1",u+"mm"),c.setAttribute("x2",g+"mm"),c.setAttribute("y2",u+"mm"),c.setAttribute("class",d),c.setAttribute("id","fd1_"+a),o.appendChild(c);let m=document.createElementNS("http://www.w3.org/2000/svg","line");m.setAttribute("x1",g+"mm"),m.setAttribute("y1",u+"mm"),m.setAttribute("x2",g+"mm"),m.setAttribute("y2",u+"mm"),m.setAttribute("class",d),m.setAttribute("id","fd2_"+a),o.appendChild(m)}else{var h,b,p=g+largo*Math.sin(s),E=u-largo*Math.cos(s);t<=r?(h=g+2*largo*Math.cos(s),b=u+2*largo*Math.sin(s)):(h=g-2*largo*Math.cos(s),b=u-2*largo*Math.sin(s));let A=document.createElementNS("http://www.w3.org/2000/svg","line");A.setAttribute("x1",g+"mm"),A.setAttribute("y1",u+"mm"),A.setAttribute("x2",p+"mm"),A.setAttribute("y2",E+"mm"),A.setAttribute("class",d),A.setAttribute("id","fd1_"+a),o.appendChild(A);let x=document.createElementNS("http://www.w3.org/2000/svg","line");x.setAttribute("x1",p+"mm"),x.setAttribute("y1",E+"mm"),x.setAttribute("x2",h+"mm"),x.setAttribute("y2",b+"mm"),x.setAttribute("class",d),x.setAttribute("id","fd2_"+a),o.appendChild(x)}}function PaintEdge(t){if(t.getElementsByTagName("Data"),"OPC Pairing"!=t.getAttribute("Type")){var e="",r="";if("EndNode to StartNode"==t.getAttribute("FlowDir")?(null!=t.getAttribute("StartNode")&&(r=xmlDoc.querySelector('[*|id="'+t.getAttribute("StartNode")+'"]')),null!=t.getAttribute("EndNode")&&(e=xmlDoc.querySelector('[*|id="'+t.getAttribute("EndNode")+'"]'))):(null!=t.getAttribute("StartNode")&&(e=xmlDoc.querySelector('[*|id="'+t.getAttribute("StartNode")+'"]')),null!=t.getAttribute("EndNode")&&(r=xmlDoc.querySelector('[*|id="'+t.getAttribute("EndNode")+'"]'))),null!=e&&null!=r){var n=e.getAttribute("cx"),l=e.getAttribute("cy"),a=r.getAttribute("cx"),o=r.getAttribute("cy"),d=n.toString().replace(",","."),s=l.toString().replace(",","."),g=a.toString().replace(",","."),u=o.toString().replace(",",".");d*=factor,g*=factor,s=maxH-s*factor,u=maxH-u*factor;var c=t.parentNode.parentNode.parentNode,m=t.getAttribute("Type");let h=document.getElementById(m+"_"+c.getAttribute("Id")),b=document.createElementNS("http://www.w3.org/2000/svg","line");b.setAttribute("x1",d+"mm"),b.setAttribute("y1",s+"mm"),b.setAttribute("x2",g+"mm"),b.setAttribute("y2",u+"mm"),b.setAttribute("id",t.getAttribute("id")),b.setAttribute("class",t.getAttribute("Type")),h.appendChild(b),document.getElementById(t.getAttribute("id")),FlowDirArrow(d,s,g,u,t.getAttribute("FlowDir"),t.getAttribute("id"),h)}}}function PaintNode(t){var e=t.getElementsByTagName("Data"),r=t.getAttribute("cx"),n=t.getAttribute("cy"),l=r.toString().replace(",","."),a=n.toString().replace(",",".");l*=factor,a=maxH-a*factor;var o=2,d="",s=e[0].getAttribute("Type");switch(s){case"Instrument":d="green";break;case"Nozzle":d="red";break;case"Equipment":d="brown",o=5;break;case"Piping Component":d="yellow";break;case"OPC":d="blue";break;case"Junction":d="orange";break;case"Equipment Component":d="brown";break;default:d="grey",s="Undefined node group"}var g=t.parentNode.parentNode.parentNode;let u=document.getElementById(s+"_"+g.getAttribute("Id")),c=document.createElementNS("http://www.w3.org/2000/svg","circle");c.setAttribute("cx",l+"mm"),c.setAttribute("cy",a+"mm"),c.setAttribute("r",o+"mm"),c.setAttribute("stroke","black"),c.setAttribute("stroke-width","1"),c.setAttribute("fill",d),c.setAttribute("fill-opacity","50%"),c.setAttribute("id",t.getAttribute("id")),c.setAttribute("class","draggable"),u.appendChild(c)}function go(){extent=(xmlDoc=parser.parseFromString(xml,"text/xml")).getElementsByTagName("Extent");var t=xmlDoc.evaluate("//Drawings/@DrawingMatrixDimension",xmlDoc,null,XPathResult.STRING_TYPE,null).stringValue;maxW=xmlDoc.evaluate("//Drawings/@MaxDrawingWidth",xmlDoc,null,XPathResult.STRING_TYPE,null).stringValue*factor*t,maxH=xmlDoc.evaluate("//Drawings/@MaxDrawingHeight",xmlDoc,null,XPathResult.STRING_TYPE,null).stringValue*factor*t,document.getElementById("mysvg").setAttribute("width",maxW+"mm"),document.getElementById("mysvg").setAttribute("height",maxH+"mm");let e=document.createElementNS("http://www.w3.org/2000/svg","rect");e.setAttribute("width",maxW+"mm"),e.setAttribute("height",maxH+"mm"),e.setAttribute("style","fill:none;stroke-width:6;stroke:rgb(55,55,255)"),document.getElementById("mysvg").appendChild(e);var r=xmlDoc.getElementsByTagName("Node");for(i=0;i<r.length;i++)PaintNode(r[i]);var n=xmlDoc.getElementsByTagName("Edge");for(i=0;i<n.length;i++)PaintEdge(n[i]);makeDraggable(),setupContextMenu(),document.addEventListener("keydown",KeyPressed,!1)}function KeyPressed(){"Escape"===event.key&&((todo=document.querySelectorAll("svg *")).forEach(t=>unhighlight(t.getAttribute("id"))),document.getElementById("floatingWindow").style.display="none")}function setupContextMenu(){contextMenu=document.getElementById("contextMenu"),modal=document.getElementById("modal"),propertiesTable=document.getElementById("propertiesTable"),document.addEventListener("click",()=>{contextMenu.classList.remove("show")});let t=document.querySelector("#contextMenu ul"),e=document.createElement("li");e.textContent="Isolate Equipment",e.onclick=equipmentIsolationPaths,t.appendChild(e),(e=document.createElement("li")).textContent="Downstream paths",e.onclick=showDownstreamPaths,t.appendChild(e),(e=document.createElement("li")).textContent="Upstream paths",e.onclick=showUpstreamPaths,t.appendChild(e),(e=document.createElement("li")).textContent="Properties",e.onclick=showProperties,t.appendChild(e);let r=document.getElementById("floatingWindow"),n=document.getElementById("windowHeader"),l=document.getElementById("closeButton");r.style.display="none";let a=0,o=0,d=!1;n.addEventListener("mousedown",t=>{d=!0,a=t.clientX-r.offsetLeft,o=t.clientY-r.offsetTop,n.style.cursor="grabbing"}),document.addEventListener("mousemove",t=>{d&&(r.style.left=`${t.clientX-a}px`,r.style.top=`${t.clientY-o}px`)}),document.addEventListener("mouseup",()=>{d=!1,n.style.cursor="grab"}),l.addEventListener("click",()=>{r.style.display="none"})}function showDownstreamPaths(){var t=document.getElementById("modal");t.classList.add("active"),setTimeout(()=>{selectedPaths=FindDownstreamPaths(currentElement.id),t.classList.remove("active"),populatePathsTable("Downstream paths")},250)}function showUpstreamPaths(){var t=document.getElementById("modal");t.classList.add("active"),setTimeout(()=>{selectedPaths=FindUpstreamPaths(currentElement.id),t.classList.remove("active"),populatePathsTable("Upstream paths")},250)}function equipmentIsolationPaths(){var t=document.getElementById("modal");t.classList.add("active"),setTimeout(()=>{selectedPaths=IsolateEquipment(currentElement.id),t.classList.remove("active"),populatePathsTable("Equipment isolation")},250)}function showProperties(){document.getElementById("floatingWindow").style.display="block";let t=currentElement.id,e=showMetadata(t);document.getElementById("windowTitle").innerHTML="Properties",propertiesTable.innerHTML="",e.forEach(t=>{let e=document.createElement("tr"),r=document.createElement("td"),n=document.createElement("td");r.textContent=t.name,r.style.textAlign="right",n.textContent=t.value,e.appendChild(r),e.appendChild(n),propertiesTable.appendChild(e)})}function closeModal(){modal.style.display="none"}function unhighlight(t){(elmt=document.getElementById(t))?(elmtClass=elmt.className.baseVal+"").includes("_highlighted")&&(elmtClass=elmtClass.substring(0,elmt.classList[0].length-12),elmt.setAttribute("class",elmtClass)):(console.log('Highlight - Element not found for element ID="'+t+'"'),console.clear())}function highlight(t){(elmt=document.getElementById(t))?(elmtClass=elmt.className.baseVal+"").includes("_highlighted")||elmt.setAttribute("class",elmtClass+"_highlighted"):(console.log('Highlight - Element not found for element ID="'+t+'"'),console.clear())}function setOpacity(t,e){document.getElementById(t).setAttribute("opacity",e)}function xPathSelect(t){for(var e=xmlDoc.evaluate(t,xmlDoc,null,XPathResult.ANY_TYPE,null),r=e.iterateNext(),n=[],l=0;r;){n[l]=r.attributes[0].nodeValue,l++;var r=e.iterateNext()}n.forEach(highlight)}function evaluateCriteria(t,e){return query="//"+(itemClass=xmlDoc.getElementById(t).localName)+"[@id='"+t+"']"+e,(matches=xmlDoc.evaluate(query,xmlDoc,null,XPathResult.BOOLEAN_TYPE,null)).booleanValue}function _findPaths(t,e,r,n,l,a,o=[]){null==a&&(a=defaultPathLengthLimit);var d=o.map(t=>t);if(d.push(t),d.length>a)return lengthExcededCount++,[];if(t===e)return[d];let s=[];var g=xmlDoc.querySelectorAll('Edge[StartNode="'+t+'"], Edge[EndNode="'+t+'"]');for(let u=0;u<g.length;u++)if(evaluateCriteria(g[u].getAttribute("id"),l)){var c="";if(evaluateCriteria(c=r?"StartNode to EndNode"==g[u].getAttribute("FlowDir")||""==g[u].getAttribute("FlowDir")?g[u].getAttribute("EndNode"):g[u].getAttribute("StartNode"):g[u].getAttribute("StartNode")===t?g[u].getAttribute("EndNode"):g[u].getAttribute("StartNode"),n)&&!d.includes(c)){let m=_findPaths(c,e,r,n,l,a,d);for(let h=0;h<m.length;h++)s.push(m[h])}}return s}function FindPaths(t,e,r,n,l,a,o=[]){return result=_findPaths(t,e,r,n,l,a,o).sort((t,e)=>t.length-e.length),lengthExcededCount>0&&(console.log("WARNING: "+lengthExcededCount+" search branches where discarded, because prune length ("+a+") was exceeded."),lengthExcededCount=0),result}function _findStreamPaths(t,e,r,n,l,a=[],o=[]){var l=defaultPathLengthLimit;null==l&&(l=defaultPathLengthLimit);var d=a.map(t=>t),s=o.map(t=>t);if(d.push(t),d.length>l)return lengthExcededCount++,[];if(""==e&&!listOfChildNozzles.includes(t)&&evaluateCriteria(t,r))return[d];let g=[];var u=0,c=xmlDoc.querySelectorAll('Edge[StartNode="'+t+'"], Edge[EndNode="'+t+'"]');for(let m=0;m<c.length;m++)if(!s.includes(c[m].getAttribute("id"))&&(s.push(c[m].getAttribute("id")),evaluateCriteria(c[m].getAttribute("id"),n))){var h="";if("Downstream"==e&&(t==c[m].getAttribute("StartNode")&&(h="StartNode to EndNode"==c[m].getAttribute("FlowDir")||""==c[m].getAttribute("FlowDir")?c[m].getAttribute("EndNode"):""),t==c[m].getAttribute("EndNode")&&(h="EndNode to StartNode"==c[m].getAttribute("FlowDir")?c[m].getAttribute("StartNode"):"")),"Upstream"==e&&(t==c[m].getAttribute("StartNode")&&(h="EndNode to StartNode"==c[m].getAttribute("FlowDir")?c[m].getAttribute("EndNode"):""),t==c[m].getAttribute("EndNode")&&(h="StartNode to EndNode"==c[m].getAttribute("FlowDir")||""==c[m].getAttribute("FlowDir")?c[m].getAttribute("StartNode"):"")),""==e&&(h=t==c[m].getAttribute("StartNode")?c[m].getAttribute("EndNode"):c[m].getAttribute("StartNode")),""!=h&&!d.includes(h)){u++;let b=_findStreamPaths(h,e,r,n,l,d,s);for(let p=0;p<b.length;p++)g.push(b[p])}}return 0==u?[d]:g}function FindDownstreamPaths(t){return(result=_findStreamPaths(t,"Downstream",downstreamNodeFilter,downstreamEdgeFilter).sort((t,e)=>t.length-e.length)).length>0&&console.log("FindDownstreamPaths : Max path lengh = "+result[result.length-1].length),lengthExcededCount>0&&(console.log("WARNING: "+lengthExcededCount+" search branches where discarded, because prune length ("+defaultPathLengthLimit+") was exceeded."),lengthExcededCount=0),result}function FindUpstreamPaths(t){return(result=_findStreamPaths(t,"Upstream",upstreamNodeFilter,upwnstreamEdgeFilter).sort((t,e)=>t.length-e.length)).length>0&&console.log("FindUpstreamPaths : Max path lengh = "+result[result.length-1].length),lengthExcededCount>0&&(console.log("WARNING: "+lengthExcededCount+" search branches where discarded, because prune length ("+defaultPathLengthLimit+") was exceeded."),lengthExcededCount=0),result.forEach(highlightPath),result}function IsolateEquipment(t){if("Equipment"==(itemToIsolate=xmlDoc.getElementById(t)).children[0].getAttribute("Type")){listOfChildNozzles="";for(var e=xmlDoc.evaluate("//Node[@id=//Edge[@Type='DirectConnection' and @EndNode='"+t+"']/@StartNode]/@id",xmlDoc,null,XPathResult.ANY_TYPE,null);noz1=e.iterateNext();)listOfChildNozzles+=noz1.value+",";for(var r=xmlDoc.evaluate("//Node[@id=//Edge[@Type='DirectConnection' and @StartNode='"+t+"']/@EndNode]/@id",xmlDoc,null,XPathResult.ANY_TYPE,null);noz2=r.iterateNext();)listOfChildNozzles+=noz2.value+",";return isolatedItemId=t,(result=_findStreamPaths(t,"",isolateNodeFilter,isolateEdgeFilter).sort((t,e)=>t.length-e.length)).length>0&&console.log("IsolateEquipment : Max path lengh = "+result[result.length-1].length),lengthExcededCount>0&&(console.log("WARNING: "+lengthExcededCount+" search branches where discarded, because prune length ("+defaultPathLengthLimit+") was exceeded."),lengthExcededCount=0),result.forEach(highlightPath),isolatedItemId="",result}}function highlightPath(t=[]){for(t.map(highlight),i=1;i<t.length;i++)highlight(xmlDoc.evaluate("//Edge[(@StartNode='"+t[i-1]+"' and @EndNode='"+t[i]+"') or (@StartNode='"+t[i]+"' and @EndNode='"+t[i-1]+"')]",xmlDoc,null,XPathResult.ANY_TYPE,null).iterateNext().attributes[0].value)}function copyPathToClipboard(t=[]){var e="[";for(i=0;i<t.length;i++){var r=xmlDoc.getElementById(t[i]),n=r.children[0].getAttribute("ItemTag");null==n&&(n=r.id),e+=n+","}e=e.slice(0,-1),e+="]",window.navigator.clipboard.writeText(e)}function populatePathsTable(t){var e=selectedPaths;propertiesTable.innerHTML="",document.getElementById("windowTitle").innerHTML=t,(fwindow=document.getElementById("floatingWindow")).style.display="block";var r='<table><tr><td><input type="checkbox" id="path_all" onchange="checkboxChanged(\'path_all\')" checked>&nbsp;'+selectedPaths.length+" paths found</td></tr></table>";e.length,r+="<table><tr valign='top'>";var n=0;e.forEach(t=>{textedPath=t.map(function t(e){return"'"+e+"'"}),0==n?r+="<td><table>":n%15==0&&(r+="</table></td><td><table>"),r+='<tr><td><input type="checkbox" id="path_'+n+'" onchange="checkboxChanged(\'path_'+n+"')\" checked></td>",r+='<td><button class="copy-btn" id="cc_'+n+'" onclick="copyPathToClipboard(['+textedPath+']);"><img src="https://jthos.github.io/copy.jpg" alt="Copy path to clipboard" class="icono"></button></td>',r+="<td>Path "+(n+1)+": "+e[n].length+" nodes</td></tr>",highlightPath(t),n++}),r+="</table></td></tr></table>",propertiesTable.innerHTML=r}function checkboxChanged(t){var e=selectedPaths;cb=document.getElementById(t),console.log(cb.checked);var r=0;if("path_all"==t)for(r=0;r<e.length;r++)document.getElementById("path_"+r).checked=cb.checked;for((todo=document.querySelectorAll("svg *")).forEach(t=>unhighlight(t.getAttribute("id"))),r=0;r<e.length;r++)document.getElementById("path_"+r).checked&&highlightPath(e[r])}
