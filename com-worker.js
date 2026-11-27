/** COM evaluation off the UI thread; only JSON-safe moves cross the boundary. */
import {chooseComMove} from './engine.js?v=0.47';
self.onmessage=event=>{
  try{
    const move=chooseComMove(event.data,{onProgress:move=>self.postMessage({move,partial:true})});
    self.postMessage({move});
  }catch(error){
    self.postMessage({move:null,error:String(error?.message||error)});
  }
};
