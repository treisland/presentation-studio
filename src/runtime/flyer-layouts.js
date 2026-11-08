const lcFlyer=(name,purpose,body,options={})=>({...lcComposition(name,purpose,body),collection:'Flyer',...options});
lcRegister({
  'flyer-event':lcFlyer('Flyer · Event','Pair a strong headline and hero image with essential event details.',[
    {id:'what',label:'What is happening',prompt:'Describe the event and who it is for. Replace this prompt with a concise invitation.'},
    {id:'details',label:'When and where',prompt:'Add confirmed date, time, location and access details. Check all placeholders before sharing.'},
    {id:'action',label:'Next step',prompt:'State how to attend or learn more. This call to action is editable slide text.'},
  ]),
  'flyer-announcement':lcFlyer('Flyer · Announcement','Make a short announcement with a clear audience and action.',[
    {id:'message',label:'The announcement',prompt:'Write the main message in plain language.'},
    {id:'details',label:'Essential details',prompt:'Explain who it affects and where to find the complete information.'},
    {id:'action',label:'What to do next',prompt:'Give one clear next step and replace any placeholder contact details.'},
  ]),
  'flyer-cover':lcFlyer('Flyer · Portfolio cover','Introduce a project with a hero visual, context and an invitation to explore.',[
    {id:'project',label:'The project',prompt:'Name the project, your role and the audience it serves.'},
    {id:'value',label:'Why it matters',prompt:'Describe the value without inventing measured results.'},
    {id:'action',label:'Explore',prompt:'Point to the next slide, a case study or a display link for more detail.'},
  ],{imageBounds:{x:.48,y:.24,w:.47,h:.59}}),
});
lcExamples.flyer={label:'Flyer',starterOnly:true,starterDescription:'Three editable event, announcement and portfolio-cover slides with original placeholder artwork. Not print-ready output.',make:name=>{
 const state=lcMakeExample(name,'Flyer',[
  {type:'flyer-event',title:'Your event headline'},
  {type:'flyer-announcement',title:'Your announcement'},
  {type:'flyer-cover',title:'Your portfolio cover'},
 ],false),slide=state.slides[0],grid=mgRoot(slide);
 state.media[slide.id]={...mediaDefaults,kind:'image',src:'assets/flyer-gathering.svg',name:'Neutral gathering illustration',alt:'An undated calendar, a location pin and a small group represent a gathering.',caption:'Original placeholder illustration; replace for your event.',fit:'contain'};
 mgMark(grid.children[0],'primary');mgArrange(state,slide);projectSetText(lcSlot(slide,'credits').node,'Original placeholder artwork: Presentation Studio · Apache 2.0. Replace with your own image credits.');slide.templateBase=projectCopy(slide.tree);delete state.startingState;state.startingState=projectCopy(state);return state;
}};
