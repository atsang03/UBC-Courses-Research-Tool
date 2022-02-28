export default class Section {
	private dataID: string;
	private dept: string;
	private id: string;
	private avg: number;
	private instructor: string;
	private title: string;
	private pass: number;
	private fail: number;
	private audit: number;
	private uuid: string;
	private year: number;

	constructor(dept: string, id: string, average: number, instructor: string, title: string,
		pass: number, fail: number, audit: number, uid: string, year: number, dataID: string) {
		this.dept = dept;
		this.id = id;
		this.avg = average;
		this.instructor = instructor;
		this.title = title;
		this.pass = pass;
		this.fail = fail;
		this.audit = audit;
		this.uuid = uid;
		this.year = year;
		this.dataID = dataID;
	}


}
