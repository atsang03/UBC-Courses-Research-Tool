export default class Section {
	private dataID: string;
	private department: string;
	private id: string;
	private average: number;
	private instructor: string;
	private title: string;
	private pass: number;
	private fail: number;
	private audit: number;
	private uid: string;
	private year: number;

	constructor(dept: string, id: string, average: number, instructor: string, title: string,
		pass: number, fail: number, audit: number, uid: string, year: number, dataID: string) {
		this.department = dept;
		this.id = id;
		this.average = average;
		this.instructor = instructor;
		this.title = title;
		this.pass = pass;
		this.fail = fail;
		this.audit = audit;
		this.uid = uid;
		this.year = year;
		this.dataID = dataID;
	}


}
