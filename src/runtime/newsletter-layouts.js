const lcNewsletter=(name,purpose,body,options={})=>({...lcComposition(name,purpose,body),collection:'Newsletter',...options});
lcRegister({
  'newsletter-lead':lcNewsletter('Newsletter · Lead story','Introduce an edition with a clear lead and recurring context.',[
    {id:'edition',label:'This edition',prompt:'Name the edition and the audience. Example: a monthly update for a fictional community group.'},
    {id:'lead',label:'Lead story',prompt:'Write the most useful update first. Keep the main point easy to find.'},
    {id:'recurring',label:'Regular section',prompt:'Introduce a recurring section that readers can recognize next time.'},
  ]),
  'newsletter-updates':lcNewsletter('Newsletter · Update cards','Group three short updates in a consistent reading order.',[
    {id:'one',label:'1. What changed',prompt:'Describe one useful change and who it affects.'},
    {id:'two',label:'2. Coming next',prompt:'Preview an upcoming activity without implying a confirmed date.'},
    {id:'three',label:'3. From the community',prompt:'Add a short original example or replace this with an attributed contribution.'},
  ],{cards:true}),
  'newsletter-curated':lcNewsletter('Newsletter · Curated reading','Present useful resource titles, display links and reasons to read.',[
    {id:'read',label:'Read',prompt:'Add a resource title, its source and a display URL. Explain why it is relevant.'},
    {id:'watch',label:'Watch or listen',prompt:'Add an accessible resource and note available captions or a transcript.'},
    {id:'try',label:'Try',prompt:'Suggest a small activity and link to clear instructions if needed.'},
  ]),
  'newsletter-closing':lcNewsletter('Newsletter · Closing action','End with a practical next step and contribution credits.',[
    {id:'action',label:'One next step',prompt:'Tell readers what they can do next. The call to action is editable slide text.'},
    {id:'contribute',label:'Contribute',prompt:'Describe how readers can contribute or where they can find the next update.'},
    {id:'sources',label:'Sources and credits',prompt:'Credit contributors and visual sources. Replace all placeholder contact details before sharing.'},
  ]),
});
lcExamples.newsletter={label:'Newsletter',starterOnly:true,starterDescription:'Four editable newsletter-style slides: lead, update cards, curated reading and closing. This is not email HTML or sending.',make:(name)=>lcMakeExample(name,'Newsletter',[
  {type:'newsletter-lead',title:'Your newsletter lead'},
  {type:'newsletter-updates',title:'Your regular updates'},
  {type:'newsletter-curated',title:'Your curated resources'},
  {type:'newsletter-closing',title:'Your next step'},
],false)};
