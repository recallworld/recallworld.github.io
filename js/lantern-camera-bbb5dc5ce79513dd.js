(() => {
 "use strict";
 const stage=document.querySelector("#forest-comparison");
 if(!stage)return;
 const marker=stage.querySelector("[data-quad-camera]");
 const master=stage.querySelector("video");
 const positions=[[81.7603,48.189],[82.3331,48.1818],[82.9348,48.1749],[82.9348,48.1749],[83.5275,48.1565],[84.1252,48.1428],[84.1252,48.1428],[84.6974,48.1328],[85.2976,48.1683],[85.2976,48.1683],[85.9006,48.164],[85.9006,48.164],[86.4689,48.1185],[87.084,48.1399],[87.084,48.1399],[87.6149,48.1095],[87.6149,48.1095],[88.1919,48.0872],[88.6996,48.1075],[88.6996,48.1075],[89.2722,48.0634],[89.8493,48.0673],[89.8493,48.0673],[90.412,48.0695],[90.9724,48.0623],[90.9724,48.0623],[91.603,48.0249],[91.603,48.0249],[92.2,47.9988],[92.7632,48.0533],[92.7632,48.0533],[93.3419,48.0172],[93.3419,48.0172],[93.8237,48.0065],[94.3259,47.9818],[94.3259,47.9818],[94.7769,47.9958],[95.1755,47.9905],[95.1755,47.9905],[95.5173,47.9589],[95.8326,47.9835],[95.8326,47.9835],[96.1396,47.9812],[96.1396,47.9812],[96.4281,47.9793],[96.6875,47.9597],[96.6875,47.9597],[96.9487,47.9714]];
 function draw(){
  const i=Math.min(positions.length-1,Math.max(0,Math.floor(master.currentTime*16)));
  marker.setAttribute("cx",positions[i][0]);marker.setAttribute("cy",positions[i][1]);
  marker.dataset.query=String(164+i);
 }
 master.addEventListener("timeupdate",draw);master.addEventListener("seeked",draw);
 function frame(){draw();master.requestVideoFrameCallback(frame);}
 if(master.requestVideoFrameCallback)master.requestVideoFrameCallback(frame);
 draw();
})();
