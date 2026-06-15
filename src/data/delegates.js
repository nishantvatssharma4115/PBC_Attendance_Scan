export const DELEGATES = [
  ["001", "Nikita Tank"],
  ["002", "Priyadharshan T"],
  ["003", "Maheshwari mangesh girade"],
  ["004", "SHAH MAHAVIR DIPESHKUMAR"],
  ["005", "Pardhiv Divvela"],
  ["006", "Prerana Jagdish Thakur"],
  ["007", "Shah Pushti Kalpeshkumar"],
  ["008", "Rahul V"],
  ["009", "Mihir Mavadia"],
  ["010", "Kritika Kamra"],
  ["011", "Aradhya Sharma"],
  ["012", "Jacklin Yohan Dabhi"],
  ["013", "Vipul Sunil Attarde"],
  ["014", "Abhishek Kumar"],
  ["015", "Aniket Ravindra Shinde"],
  ["016", "Y.Sai Shisir"],
  ["017", "Vaishnavi dixit"],
  ["018", "Aishwarya Dadhich"],
  ["019", "Rishika bishnoi"],
  ["020", "Ritaja Mishra"],
  ["021", "Samridhi Gupta"],
  ["022", "Vatsala Singh"],
  ["023", "shiyaath Baraj"],
  ["024", "Deepak"],
  ["025", "Sai Sraval"],
  ["026", "Suhas LS"],
  ["027", "prajit keshav portet"],
  ["028", "Abhi Singh"],
  ["029", "Adrita Mukherjee"],
  ["030", "Susmita Sinha"],
  ["031", "Rugved Rajendra Babhulkar"],
  ["032", "Krisha Vihar Anand"],
  ["033", "Vanita Pandya"],
  ["034", "Kedarnath Chindam"],
  ["035", "Padma Sowndarya V"],
  ["036", "Hardik Tatiwala"],
  ["037", "Chelsy Pareek"],
  ["038", "RAJAMURI SAI RITHIK REDDY"],
  ["039", "Gangala Dhanurkesh Yadav"],
  ["040", "Siddhi Srivastava"],
  ["041", "Arkadyute Nath"],
  ["042", "Krupa Hrushikesh Shrotriya"],
  ["043", "Nikitha Mallam"],
  ["044", "Nilanjana Bhattacharjee"],
  ["045", "Neha Chakravarthy"],
  ["046", "Krishn Kumar Gupta"],
  ["047", "BEESAM VIGNESH"],
  ["048", "Sushant Prakash Kurane"],
  ["049", "Md shakeel Pasha"],
  ["050", "Utkarsh Singh"],
  ["051", "Abdullah H"],
  ["052", "Sachin Annigeri"],
  ["053", "S Rajesh"],
  ["054", "ARATHI V.T."],
  ["055", "ARPIT AWASTHI"],
  ["056", "TANK BHARATKUMAR NARAYANLAL"],
  ["057", "Aditi Bhatt"],
  ["058", "Soumya Agrawal"],
  ["059", "Rohit Manchanda"],
  ["060", "Nidhi Agarwal"],
  ["061", "Rushikesh Akula"],
  ["062", "Awani Gupta"],
  ["063", "Himanshu Patidar"],
  ["064", "Abhinav"],
  ["065", "Bandaru Hima Mani Satya Kumar"],
  ["066", "Vishal Ahlawat"],
  ["067", "MANASA THUDURI"],
  ["068", "Vaidehi Sahu"],
  ["069", "Rudri Vinod Dave"],
  ["070", "Ayush Bhujade"],
  ["071", "Harshit Srivastava"],
  ["072", "Sonali Prajapati"],
  ["073", "Gaurav Thakur"],
  ["074", "S. Sharmila"],
  ["075", "A.VARSHINI"],
  ["076", "V.kavya"],
  ["077", "Srimathi.R"],
  ["078", "Siva SriMathi"],
  ["079", "Bargavi prarthanaa"],
  ["080", "MANISHA M"],
  ["081", "Shivani"],
  ["082", "Priyansh Sharma"],
  ["083", "RAJAT MADDHESHIYA"],
  ["084", "Ruju Apurva Shah"],
  ["085", "Parth Gunwantrao Kadam"],
  ["086", "Chetan Soni"],
  ["087", "Shreeja Santosh Rayane"],
  ["088", "Bhakti Shivaji Mane"],
  ["089", "Chetananand Yashpal Patil"],
  ["090", "Swastika Kumari"],
  ["091", "Shivam Kant"],
  ["092", "Ribhav Rabha"],
  ["093", "Jayant Agrawal"],
  ["094", "Himani Pandey"],
  ["095", "Mihir Kumar"],
  ["096", "Arham Nagori"],
  ["097", "KARTHIK H P"],
  ["098", "Tharanish M"],
  ["099", "Shah Hiranshi Sandipkumar"],
  ["100", "Simi Baruah"],
  ["101", "Shwetha.S"],
  ["102", "Mahi Singh"],
  ["103", "Dr. Poornima R Vijaya"],
  ["104", "Swastika Jaiswal"],
  ["105", "MOHIT RAWAL"],
  ["106", "Moytri Baul Ador"],
  ["107", "Prashant Gautam"],
  ["108", "Sreesaipavan.T"],
  ["109", "Aayush Rehal"],
  ["110", "mainula tewari"],
  ["111", "Ajay Choudhary"],
  ["112", "b poojitha"],
  ["113", "Abhinav Choudhary"],
  ["114", "Bijay Dhukuchhu"],
  ["115", "Siddharth Goswami"],
  ["116", "LAVUDYA NITHIN KUMAR"],
  ["117", "Sakshi Goyal"],
  ["118", "Satish Kumar"],
  ["119", "Sk Sahin Uddin"],
  ["120", "Shivani Singh"],
  ["121", "Daman"],
  ["122", "Bhavna Singh"],
  ["123", "Anuradha Jat"],
  ["124", "Surbhi Siwach"],
  ["125", "ARADHANA PANDEY"]
];

export const EVENT_START = new Date("2026-06-13");
export const TOTAL_DAYS = 15;
export const SESSIONS_DAY = 10;
export const TOTAL_DELEGATES = DELEGATES.length;

export const ID_TO_NAME = Object.fromEntries(DELEGATES);
export const VALID_IDS = new Set(DELEGATES.map(d => d[0]));

export const NAME_TO_ID = {};
function normName(s) {
  return s.toLowerCase().replace(/\s+/g, " ").trim();
}

DELEGATES.forEach(([id, name]) => {
  NAME_TO_ID[normName(name)] = id;
  NAME_TO_ID[name.toUpperCase()] = id;
  NAME_TO_ID[name] = id;
});

export function parseQR(raw) {
  const trimmed = raw.trim();

  // Format: PBC2026|001|Name
  const parts = trimmed.split("|");
  if (parts.length >= 3 && parts[0].startsWith("PBC")) {
    const id = parts[1].trim().padStart(3, "0");
    const name = parts.slice(2).join("|").trim();
    if (VALID_IDS.has(id)) return { ok: true, id, name: ID_TO_NAME[id] || name };
    return { ok: false, reason: "Unknown delegate ID in QR" };
  }

  // Format: plain name (current printed cards)
  const byName = NAME_TO_ID[trimmed] || NAME_TO_ID[normName(trimmed)] || NAME_TO_ID[trimmed.toUpperCase()];
  if (byName) return { ok: true, id: byName, name: ID_TO_NAME[byName] };

  // Format: just ID like "042"
  const idOnly = trimmed.padStart(3, "0");
  if (/^\d{3}$/.test(idOnly) && VALID_IDS.has(idOnly)) {
    return { ok: true, id: idOnly, name: ID_TO_NAME[idOnly] };
  }

  return { ok: false, reason: "Not a recognised PBC delegate QR" };
}

export function dayDate(day) {
  const d = new Date(EVENT_START);
  d.setDate(d.getDate() + day - 1);
  return d;
}

export function fmtDate(d) {
  return d.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

export function fmtTime(iso) {
  return new Date(iso).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
}
