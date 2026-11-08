function lcComic(name,purpose,body,images=1,options={}){
  return {...lcComposition(name,purpose,body,images,images>1),collection:'Comic',...options};
}
lcRegister({
  'comic-opening':lcComic('Comic · Opening','Introduce a character, setting and a small question.',[
    {id:'setting',label:'1. Set the scene',prompt:'Introduce the character and where the story begins.'},
    {id:'dialogue',label:'Dialogue',prompt:'Write a short line your character could say.'},
  ]),
  'comic-sequence':lcComic('Comic · Panel sequence','Read three numbered visuals left to right with independent captions and crops.',[
    {id:'intro',label:'Sequence',prompt:'Describe what changes from panel 1 to panel 3. Add a caption and image description to each panel.'},
  ],3,{rows:1,cols:3,imageBounds:{x:.05,y:.34,w:.9,h:.48},readingOrder:['title','introduction','panel 1','panel 2','panel 3','credits']}),
  'comic-explanation':lcComic('Comic · Explanation','Add context and editable speech without flattening text into artwork.',[
    {id:'context',label:'What happened',prompt:'Explain the moment that deserves a closer look.'},
    {id:'dialogue',label:'Speech bubble',prompt:'Keep dialogue brief. This text stays editable.'},
    {id:'meaning',label:'Why it matters',prompt:'Connect the moment to the story’s larger point.'},
  ]),
  'comic-takeaway':lcComic('Comic · Takeaway','Close the story with a clear lesson and next step.',[
    {id:'lesson',label:'The lesson',prompt:'What should your audience remember from this story?'},
    {id:'action',label:'Try it',prompt:'Suggest one small action the audience can take.'},
  ]),
});
const lcComicArt=(n,caption)=>({src:'assets/comic-seed-'+n+'.svg',name:'Seed story panel '+n,caption,alt:[
  'A person notices a small shelf with a plant and a seed packet.',
  'Two people talk beside the seed shelf; one offers a packet.',
  'A person tends a young plant and returns a packet to the community shelf.',
][n-1]});
lcExamples.comic={label:'Comic',starterDescription:'Four slides with editable story prompts, speech and panel captions.',demoDescription:'A complete original four-slide seed-sharing story with three offline illustrations.',make:(name,demo)=>lcMakeExample(name,'Comic',[
  {type:'comic-opening',title:'A small packet, a new idea',copy:{setting:'On a walk through a community room, Mira notices a shelf of seed packets.',dialogue:'“Are these for anyone to grow?”'},assets:[lcComicArt(1,'1. Notice the shared shelf.')]},
  {type:'comic-sequence',title:'Notice → ask → share',copy:{intro:'Read left to right. Mira notices the shelf, asks how it works, then grows a plant and returns seeds.'},assets:[lcComicArt(1,'1. Notice'),lcComicArt(2,'2. Ask'),lcComicArt(3,'3. Share')]},
  {type:'comic-explanation',title:'A question opens the story',copy:{context:'A volunteer explains the shelf: take a packet, learn what it needs, and share what you can later.',dialogue:'“Start with one plant. You can bring seeds back when you have some.”',meaning:'Clear, welcoming instructions turn an unfamiliar shelf into something Mira can try.'},assets:[lcComicArt(2,'A welcoming explanation.')]},
  {type:'comic-takeaway',title:'Small starts can become shared knowledge',copy:{lesson:'This fictional story is about asking a question and making a modest, achievable start.',action:'Look for a local seed-sharing group. Ask about safe, suitable plants and follow its guidance.'},assets:[lcComicArt(3,'Keep learning and share what you can.')]},
],demo)};
