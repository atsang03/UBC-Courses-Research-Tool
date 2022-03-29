export default class WhereValidator {
	private roomsFields: string[] =
		["fullname", "shortname", "number", "name", "address", "lat", "lon", "seats", "type", "furniture", "href"];

	private roomsMfields: string[] = ["lat","lon","seats"];
	private roomsSfields: string[] = ["fullname", "shortname", "number", "name", "address","type", "furniture", "href"];

	private coursesMfields: string[] = ["avg", "pass", "fail", "audit", "year"];
	private coursesSfields: string[] = ["dept", "id", "instructor", "title", "uuid"];
	private logic: string[] = ["AND", "OR"];
	private mComparator: string[] = ["LT", "GT", "EQ"];

	private dataId: string;
	private coursesUsage: boolean;

	constructor(dataId: string, coursesUsage: boolean) {
		this.dataId = dataId;
		this.coursesUsage = coursesUsage;
	}

	public checkWhere(jsonObj: any): boolean {
		if (typeof jsonObj !== "object") {
			return true;
		}
		let keys = Object.keys(jsonObj);
		if (keys.length === 0) {
			return false;
		}
		if (keys.length > 1) {
			return true;
		}
		let key: string = Object.keys(jsonObj)[0];
		if (this.logic.includes(key)) {
			return this.checkLogic(jsonObj[key]);
		} else if (this.mComparator.includes(key)) {
			return this.checkMComparator(jsonObj[key]);
		} else if (key === "IS") {
			return this.checkIs(jsonObj[key]);
		} else if (key === "NOT") {
			return this.checkFilter(jsonObj[key]);
		} else {
			return true;
		}
	}

	private checkFilter(jsonObj: any): boolean {
		if (typeof jsonObj !== "object") {
			return true;
		} else if (Object.keys(jsonObj).length !== 1) {
			return true;
		}
		let keys = Object.keys(jsonObj);
		if (keys.length > 1) {
			return true;
		}
		let key: string = Object.keys(jsonObj)[0];
		if (this.logic.includes(key)) {
			return this.checkLogic(jsonObj[key]);
		} else if (this.mComparator.includes(key)) {
			return this.checkMComparator(jsonObj[key]);
		} else if (key === "IS") {
			return this.checkIs(jsonObj[key]);
		} else if (key === "NOT") {
			return this.checkFilter(jsonObj[key]);
		} else {
			return true;
		}
	}

	private checkLogic(jsonObj: any): boolean {
		if (!Array.isArray(jsonObj)) {
			return true;
		} else if (jsonObj.length === 0) {
			return true;
		}
		for (let obj of jsonObj) {
			if (this.checkFilter(obj)) {
				return true;
			}
		}
		return false;
	}

	private checkMComparator(jsonObj: any): boolean {
		if (typeof jsonObj !== "object") {
			return true;
		} else if (Object.keys(jsonObj).length !== 1) {
			return true;
		}
		let mKey: string = Object.keys(jsonObj)[0];
		let id: string = mKey.split("_")[0];
		let field: string = mKey.split("_")[1];
		let value: any = Object.values(jsonObj)[0];
		if (typeof value !== "number") {
			return true;
		}
		if (id !== this.dataId) {
			return true;
		}
		if (this.coursesUsage) {
			if (!this.coursesMfields.includes(field)) {
				return true;
			}
		} else {
			if (!this.roomsMfields.includes(field)) {
				return true;
			}
		}
		return false;
	}

	private checkIs(jsonObj: any): boolean {
		if (typeof jsonObj !== "object") {
			return true;
		} else if (Object.keys(jsonObj).length !== 1) {
			return true;
		}
		let skey: string = Object.keys(jsonObj)[0];
		let id: string = skey.split("_")[0];
		let field: string = skey.split("_")[1];
		let value: any = Object.values(jsonObj)[0];
		if (typeof value !== "string") {
			return true;
		}
		if (id !== this.dataId) {
			return true;
		}
		if (this.coursesUsage) {
			if (!this.coursesSfields.includes(field)) {
				return true;
			}
		} else {
			if (!this.roomsSfields.includes(field)) {
				return true;
			}
		}
		return this.checkWildCard(jsonObj);
	}

	private checkWildCard(jsonObj: any): boolean {
		let obj: string = String(Object.values(jsonObj)[0]);
		if ((obj.match(/[*]/g) || []).length > 2) {
			return true;
		} else if ((obj.match(/[*]/g) || []).length === 2) {
			let objLength = String(Object.values(jsonObj)[0]).length;
			return !(obj[0] === "*" && obj[objLength - 1] === "*");
		} else if ((obj.match(/[*]/g) || []).length === 1) {
			let objLength = String(Object.values(jsonObj)[0]).length;
			return !(obj[0] === "*" || obj[objLength - 1] === "*");
		}
		return false;
	}
}
