const records = [
  ['2012','2012_Paper1_Answers_Marks_ZH.pdf',9,'非官方中文翻譯；來源及答案待核對'],
  ['PP','PP_Paper1_Answers_Marks_ZH.pdf',14,'中文答案及配分整理版'],
  ['2013','2013_Paper1_Answers_Marks_ZH.pdf',14,'中文答案及配分整理版'],
  ['2014','2014_Paper1_Answers_Marks_ZH.pdf',14,'中文答案及配分整理版'],
  ['2015','2015_Paper1_Answers_Marks_ZH.pdf',14,'中文答案及配分整理版'],
  ['2016','2016_Paper1_Answers_Marks_ZH.pdf',14,'中文答案及配分整理版'],
  ['2017','2017_Paper1_Answers_Marks_ZH.pdf',12,'中文答案及配分整理版'],
  ['2018','2018_Paper1_Answers_Marks_ZH.pdf',13,'中文答案及配分整理版'],
  ['2019','2019_Paper1_Answers_Marks_ZH.pdf',12,'中文答案及配分整理版'],
  ['2020','2020_Paper1_Answers_Marks_ZH.pdf',11,'中文答案及配分整理版'],
  ['2021','2021_Paper1_Answers_Marks_ZH.pdf',12,'中文答案及配分整理版'],
  ['2022',null,0,'評卷參考尚未整理'],
  ['2023',null,0,'評卷參考尚未整理']
];
export const markingSchemes=Object.fromEntries(records.map(([year,name,pages,note])=>{
  if(!name)return [year,null];
  return [year,{name,pages,note,url:`marking-schemes-zh/${name}`}];
}));
