import WhereValidator from "./WhereValidator";

export default class QueryValidator {
	private roomsFields: string[] =
		["fullname", "shortname", "number", "name", "address", "lat", "lon", "seats", "type", "furniture", "href"];

	private coursesMfields: string[] = ["avg", "pass", "fail", "audit", "year"];
	private coursesSfields: string[] = ["dept", "id", "instructor", "title", "uuid"];
	private dataId: string = "";
	private columnKeys: string[] = [];
	private coursesUsage: boolean = false;

	public validation(jsonObj: any, wantedFields: string[]): boolean {
		if (this.checkBody(jsonObj)) {
			return true;
		}
		for (let i of jsonObj["OPTIONS"]["COLUMNS"]) {
			wantedFields.push(i.split("_")[1]);
		}
		return false;
	}

	private checkBody(jsonObj: any): boolean {
		if (typeof jsonObj !== "object") {
			return true;
		}
		let keys = Object.keys(jsonObj);
		if (keys.length !== 2) {
			return true;
		}
		if (!keys.includes("WHERE") || !keys.includes("OPTIONS")) {
			return true;
		}
		if (this.checkOptions(jsonObj["OPTIONS"])) {
			return true;
		}
		let whereValidator: WhereValidator = new WhereValidator(this.dataId,this.coursesUsage);
		return whereValidator.checkWhere(jsonObj["WHERE"]);
	}

	private checkOptions(jsonObj: any): boolean {
		if (typeof jsonObj !== "object") {
			return true;
		}
		let keys: string[] = Object.keys(jsonObj);
		if (keys.length > 2 || keys.length === 0) {
			return true;
		}
		if (keys.length === 1) {
			if (!keys.includes("COLUMNS")) {
				return true;
			}
			return this.checkColumns(jsonObj["COLUMNS"]);
		} else if (keys.length === 2) {
			if (!keys.includes("COLUMNS") || !keys.includes("ORDER")) {
				return true;
			}
			return this.checkColumns(jsonObj["COLUMNS"]) || this.checkOrder(jsonObj["ORDER"]);
		}
		return true;
	}

	private checkColumns(jsonObj: any): boolean {
		if (!Array.isArray(jsonObj)) {
			return true;
		} else if (jsonObj.length === 0) {
			return true;
		}
		this.dataId = String(jsonObj[0]).split("_")[0];
		let firstField: string = String(jsonObj[0]).split("_")[1];
		this.coursesUsage = this.coursesSfields.includes(firstField) || this.coursesMfields.includes(firstField);
		for (let obj of jsonObj) {
			let id: string = String(obj).split("_")[0];
			let field: string = String(obj).split("_")[1];
			if (this.coursesUsage) {
				if (id !== this.dataId) {
					return true;
				} else if (!this.coursesSfields.includes(field) && !this.coursesMfields.includes(field)) {
					return true;
				}
			} else {
				if (id !== this.dataId) {
					return true;
				} else if (!this.roomsFields.includes(field)) {
					return true;
				}
			}
			this.columnKeys.push(obj);
		}
		return false;
	}

	private checkOrder(jsonObj: any): boolean {
		if (typeof jsonObj === "string") {
			return !this.columnKeys.includes(String(jsonObj));
		} else if (typeof jsonObj === "object") {
			let keys = Object.keys(jsonObj);
			if (keys.length !== 2) {
				return true;
			} else if (!keys.includes("keys") || !keys.includes("dir")) {
				return true;
			}
			return this.checkDir(jsonObj["dir"]) || this.checkKeys(jsonObj["keys"]);
		} else {
			return true;
		}
	}

	private checkDir(jsonObj: any): boolean {
		if (typeof jsonObj !== "string") {
			return true;
		} else if (String(jsonObj) !== "DOWN" || String(jsonObj) !== "UP") {
			return true;
		}
		return false;
	}

	private checkKeys(jsonObj: any): boolean {
		if (!Array.isArray(jsonObj)) {
			return true;
		} else if (jsonObj.length === 0) {
			return true;
		}
		for (let obj of jsonObj) {
			if (!this.columnKeys.includes(obj)) {
				return true;
			}
		}
		return false;
	}
}
