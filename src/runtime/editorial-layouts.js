const lcEditorial=(name,purpose,body,options={})=>{const layout={...lcComposition(name,purpose,body),collection:'Editorial',...options};if(layout.masthead)layout.slots.unshift({id:'masthead',label:'Masthead',tag:'p',limit:100});return layout;};
lcRegister({
  'editorial-cover':lcEditorial('Editorial · Newspaper cover','Pair an editable masthead and lead headline with a story visual.',[
    {id:'lead',label:'Lead story',prompt:'Introduce the story and why it belongs in this edition.'},
    {id:'inside',label:'In this issue',prompt:'Preview the ideas your reader will find in the next slides.'},
  ],{masthead:'THE COMMUNITY NOTEBOOK',imageBounds:{x:.55,y:.30,w:.4,h:.53},readingOrder:['masthead','headline','lead story','inside','visual','credits']}),
  'editorial-lead':lcEditorial('Editorial · Blog lead','Open a readable case story with an introduction and context.',[
    {id:'intro',label:'The story',prompt:'Start with a clear introduction for a reader who is new to the topic.'},
    {id:'context',label:'Context',prompt:'Explain the setting, perspective and limits of the story.'},
    {id:'next',label:'What follows',prompt:'Give the reader a reason to continue to the next section.'},
  ]),
  'editorial-columns':lcEditorial('Editorial · Newspaper columns','Read the left article column before the right; no automatic pagination.',[
    {id:'left',label:'First perspective',prompt:'Write the first part of your story. Keep it within this slide and continue on another slide when needed.',limit:650},
    {id:'right',label:'Second perspective',prompt:'Continue with the second perspective, preserving the intended reading order.',limit:650},
  ],{columns:2,bodyBottom:.71,imageBounds:{x:.76,y:.74,w:.19,h:.14},readingOrder:['headline','left column heading and text','right column heading and text','visual','credits']}),
  'editorial-feature':lcEditorial('Editorial · Image and pull quote','Use an editable pull quote to introduce a visual story.',[
    {id:'quote',label:'Pull quote',prompt:'Add a concise, attributed quote or clearly marked editorial observation.',limit:160},
    {id:'context',label:'Behind the image',prompt:'Explain what the image shows and why it matters to the story.'},
    {id:'source',label:'Source',prompt:'Credit the visual and identify the speaker or source of the quote.'},
  ]),
  'editorial-closing':lcEditorial('Editorial · Closing note','Close with a takeaway, sources and a next step.',[
    {id:'takeaway',label:'Takeaway',prompt:'Sum up the one idea readers should carry forward.'},
    {id:'readmore',label:'Continue reading',prompt:'Provide a source, a display link or a practical next step.'},
    {id:'credits',label:'Editorial credits',prompt:'Name contributors and sources.'},
  ].map(s=>s.id==='credits'?{...s,id:'contributors'}:s)),
});
const lcEditorialImage=(name,alt,caption)=>({src:'assets/portfolio-'+name+'.svg',name:'Community notebook '+name,alt,caption});
lcExamples.editorial={label:'Editorial',starterDescription:'Five editable newspaper/blog-style slides with prompts, columns and a pull quote.',demoDescription:'A complete fictional community notebook with original offline diagrams and source credits.',make:(name,demo)=>lcMakeExample(name,'Editorial',[
  {type:'editorial-cover',title:'Small improvements, shared notes',copy:{lead:'This fictional edition follows a volunteer team exploring clearer signs in a shared community room.',inside:'Inside: the question behind the project, two perspectives, a visual observation and a closing note.'},assets:[lcEditorialImage('signs','A sign sketch points to Welcome, Find a book and Quiet spaces.','An original sign concept, not a deployed installation.')]},
  {type:'editorial-lead',title:'A notebook for shared places',copy:{intro:'A shared room serves many people. Clear labels can help newcomers understand what is available and where to begin.',context:'Our fictional editorial team follows a small design exercise. No real participant data or measured outcomes are reported.',next:'The next page pairs the visitor perspective with the volunteer perspective.'},assets:[lcEditorialImage('library','Arrival, discovery and quiet reading connect in a visitor journey.','A fictional visitor journey.')]},
  {type:'editorial-columns',title:'Two perspectives on one small change',copy:{left:'For a newcomer, a room can be full of clues that regular visitors no longer notice. A welcome sign, a plain-language label and a short route guide can make the first question easier to ask. This fictional perspective is a prompt for observation, not a claim about every visitor.',right:'For a volunteer, fewer ambiguous labels can make an explanation more consistent. The design exercise starts with listening, then sketches a guide and tests its wording. A larger trial would still be needed to learn whether the proposed changes help in everyday use.'},assets:[lcEditorialImage('workshop','Observe, sketch, walk through and revise form a four-step workshop.','A proposed workshop sequence.')]},
  {type:'editorial-feature',title:'The useful question is often a small one',copy:{quote:'“What would make the first visit easier?”',context:'This editorial prompt frames the sign sketch as a question to test, rather than a finished answer.',source:'Editorial prompt and diagrams: Presentation Studio. Fictional concept study; Apache 2.0 artwork.'},assets:[lcEditorialImage('signs','Three plain-language signs are shown as a concept sketch.','A visual prompt for discussion.')]},
  {type:'editorial-closing',title:'Keep the notebook open',copy:{takeaway:'A small design question can become a useful shared record when observations, decisions and limits are kept together.',readmore:'Choose one question in a shared place, write down what you notice and ask the people who use it.',contributors:'Original fictional writing and diagrams: Presentation Studio. No real institution or participant is represented.'},assets:[lcEditorialImage('plan','Revise wording, test access, observe real use and share findings.','A follow-up plan, not a reported result.')]},
],demo)};
