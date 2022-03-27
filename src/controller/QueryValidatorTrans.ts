import WhereValidator from "./WhereValidator";

export default class QueryValidatorTrans {
	private allowedKeys: string[] = [];
	private columnKeys: string[] = [];
	private coursesUsage: boolean = false;
	private dataId: string = "";
	private roomsFields: string[] =
		["fullname", "shortname", "number", "name", "address", "lat", "lon", "seats", "type", "furniture", "href"];

	private coursesMfields: string[] = ["avg", "pass", "fail", "audit", "year"];
	private coursesSfields: string[] = ["dept", "id", "instructor", "title", "uuid"];
	private applyTokens: string[] = ["MAX", "MIN", "AVG", "COUNT", "SUM"];

	public validation(jsonObj: any, wantedFields: string[]): boolean {
		return this.checkBody(jsonObj);
	}

	private checkBody(jsonObj: any): boolean {
		if (typeof jsonObj !== "object") {
			return true;
		}
		let keys = Object.keys(jsonObj);
		if (keys.length !== 3) {
			return true;
		}
		if (!keys.includes("WHERE") || !keys.includes("OPTIONS") || !keys.includes("TRANSFORMATIONS")) {
			return true;
		}
		if (this.checkTransformations(jsonObj["TRANSFORMATIONS"]) || this.checkOptions(jsonObj["OPTIONS"])) {
			return true;
		}
		let whereValidator: WhereValidator = new WhereValidator(this.dataId,this.coursesUsage);
		return whereValidator.checkWhere(jsonObj["WHERE"]);
	}

	private checkTransformations(jsonObj: any): boolean {
		if (typeof jsonObj !== "object") {
			return true;
		}
		let keys = Object.keys(jsonObj);
		if (keys.length !== 2) {
			return true;
		} else if (!keys.includes("GROUP") || !keys.includes("APPLY")) {
			return true;
		}
		return this.checkGroup(jsonObj["GROUP"]) || this.checkApply(jsonObj["APPLY"]);
	}

	private checkGroup(jsonObj: any): boolean {
		if (!Array.isArray(jsonObj)) {
			return true;
		} else if (jsonObj.length < 1) {
			return true;
		}
		if (String(jsonObj[0]).split("_")[0].length === 0 ||
			String(jsonObj[0]).split("_").length > 2) {
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
			this.allowedKeys.push(obj);
		}
		return false;
	}

	private checkApply(jsonObj: any): boolean {
		if (!Array.isArray(jsonObj)) {
			return true;
		}
		for (let obj of jsonObj) {
			if (this.checkApplyRule(obj)) {
				return true;
			}
			this.allowedKeys.push(obj);
		}
		return false;
	}

	private checkApplyRule(jsonObj: any): boolean {
		if (typeof jsonObj !== "object") {
			return true;
		}
		let applyKey: string = String(Object.keys(jsonObj)[0]);
		if (applyKey.length < 1 || applyKey.includes("_")) {
			return true;
		}
		if (this.checkApplyRuleValue(jsonObj[applyKey])) {
			return true;
		}
		this.allowedKeys.push(applyKey);
		return false;
	}

	private checkApplyRuleValue(jsonObj: any): boolean {
		if (typeof jsonObj !== "object") {
			return true;
		}
		let applyToken: string = Object.keys(jsonObj)[0];
		if (!this.applyTokens.includes(applyToken)) {
			return true;
		}
		let applyTokenValue: string = String(jsonObj[applyToken]);
		let key: string = applyTokenValue.split("_")[0];
		let field: string = applyTokenValue.split("_")[1];
		if (this.coursesUsage) {
			if (key !== this.dataId || (!this.coursesMfields.includes(field) && !this.coursesSfields.includes(field))) {
				return true;
			}
		} else {
			if (key !== this.dataId || !this.roomsFields.includes(field)) {
				return true;
			}
		}
		return false;
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
		for (let obj of jsonObj) {
			if (!this.allowedKeys.includes(obj)) {
				return true;
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
