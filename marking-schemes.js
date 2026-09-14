const records = [
  ['2012','2012_Maths_Paper1_Marking_CHI.pdf',10,'英文非官方原件；原件署名 xeror；來源及答案待核對'],
  ['PP','2012_Maths_Practice Paper1_Marking_CHI.pdf',17,'練習卷暫定稿；只限教師參閱'],
  ['2013','2013_Maths_Paper1_Marking_CHI.pdf',15,'中文掃描版'],
  ['2014','2014_Maths_Paper1_Marking_CHI.pdf',8,'中文掃描版'],
  ['2015','2015_Maths_Paper1_Marking_CHI.pdf',8,'中文掃描版'],
  ['2016','2016_Maths_Paper1_Marking_CHI.pdf',8,'中文掃描版'],
  ['2017','2017_Maths_Paper1_Marking_CHI.pdf',7,'中文掃描版'],
  ['2018','2018_Maths_Paper1_Marking_CHI.pdf',13,'中文；原件標示只限閱卷員使用'],
  ['2019','2019_Maths_Paper1_Marking_CHI.pdf',7,'中文掃描版'],
  ['2020','2020_Maths_Paper1_Marking_CHI.pdf',7,'中文掃描版'],
  ['2021','2021_Maths_Paper1_Marking_CHI.pdf',7,'中文掃描版'],
  ['2022',null,0,'評卷參考尚未整理'],
  ['2023',null,0,'評卷參考尚未整理']
];
const chinesePages={2012:9,PP:14,2013:14,2014:14,2015:14,2016:14,2017:12,2018:13,2019:12,2020:11,2021:12};
export const markingSchemes=Object.fromEntries(records.map(([year,name,pages,note])=>{
  if(!name)return [year,null];
  const original={name,pages,note,url:`marking-schemes/${encodeURIComponent(name)}`};
  if(!chinesePages[year])return [year,original];
  const translatedName=`${year}_Paper1_Answers_Marks_ZH.pdf`;
  const translatedNote=year==='2012'?'非官方原件中文翻譯；原件署名 xeror；來源及答案待核對':'中文答案及配分整理版；保留來源及使用限制';
  return [year,{name:translatedName,pages:chinesePages[year],note:translatedNote,url:`marking-schemes-zh/${translatedName}`}];
}));
