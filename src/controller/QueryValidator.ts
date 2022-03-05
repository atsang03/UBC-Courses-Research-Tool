export default class QueryValidator {
	private JsonObj: any;
	private data: any;
	private listOfID: string[];
	private wantedFields: string[];
	constructor(JsonObj: any,data: any,listOfID: string[],wantedFields: string[]) {
		this.JsonObj = JsonObj;
		this.data = data;
		this.listOfID = listOfID;
		this.wantedFields = wantedFields;
	}

	public validation(JsonObj: any,data: any,listOfID: string[],wantedFields: string[]): boolean {
		if (this.checkSizeWhereOptionsColumns(JsonObj)) {
			return true;
			// return Promise.reject(new InsightError("missing WHERE/OPTIONS/COLUMNS or invalid # of keys in sections"));
		}
		let DataId: string = JSON.parse(JSON.stringify(JsonObj["OPTIONS"]["COLUMNS"]))[0].split("_")[0];
		for (let i of data) {
			listOfID.push(i["dataID"]);
		}
		if (!listOfID.includes(DataId) || this.checkColumnsAndOrderDataSetReferences(JsonObj,DataId)) {
			return true;
			// return Promise.reject(new InsightError("Referencing not yet added Dataset or error in OPTIONS"));
		}
		for (let i of JsonObj["OPTIONS"]["COLUMNS"]) {
			wantedFields.push(i.split("_")[1]);
		}
		if (this.validateWhereSuite(JsonObj,DataId)) {
			return true;
			// return Promise.reject(new InsightError("error in WHERE"));
		}
		return false;
	}


	private validateWhereSuite(obj: object, dataId: string): boolean {
		let JsonObj = JSON.parse(JSON.stringify(obj));
		if (JSON.stringify(JsonObj["WHERE"]) === "{}") {
			return false;
		} else if (!this.referenceOnlyOneDataSet(JsonObj["WHERE"],dataId,true)) {
			return true;
		} else if(!this.checkFieldInWhere(JsonObj["WHERE"],true)) {

			return true;
		}
		return false;
	}

	private checkFieldInWhere(obj: object,initial: boolean): boolean {
		let result: boolean = initial;
		let logic: string[] = ["AND","OR"];
		let mcomparator: string[] = ["EQ","GT","LT"];
		if (result) {
			for (let i of Object.keys(obj)) {
				if (logic.includes(i)) {
					result = this.handleLogic(obj,result);
				} else if (mcomparator.includes(i)) {
					result = this.handleMcomparison(obj,result);
				} else if (i === "IS") {
					result = this.handleIS(obj,result);
				} else if (i === "NOT") {
					for (let j of Object.values(obj)) {
						result = this.checkFieldInWhere(j,result);
					}
				} else {
					result = false;
				}
			}
		}
		return result;
	}

	private referenceOnlyOneDataSet(obj: object, dataId: string,initial: boolean): boolean {
		let result: boolean = initial;
		if (obj === null) {
			return result;
		} else if (result) {
			for (let i of Object.keys(obj)) {
				if ((i.includes("_"))) {
					result = i.split("_")[0] === dataId;
				} else {
					for (let j of Object.values(obj)) {
						result = this.referenceOnlyOneDataSet(j, dataId,result);
					}
				}
			}
		}
		return result;
	}

	private checkColumnsAndOrderDataSetReferences(obj: any, dataId: string): boolean {
		let mfield: string[] = ["avg","pass","fail","audit","year"];
		let sfield: string[] = ["dept","id","instructor","title", "uuid"];
		for (let value of Object.values(obj["OPTIONS"]["COLUMNS"])) {
			let ParsedValue: string = JSON.parse(JSON.stringify(value));
			if (dataId !== ParsedValue.split("_")[0] ||
				!(mfield.includes(ParsedValue.split("_")[1]) ||
					sfield.includes(ParsedValue.split("_")[1]))) {
				return true;
			}
		}
		if (Object.keys(obj["OPTIONS"]).includes("ORDER")) {
			let value: string = obj["OPTIONS"]["ORDER"];
			return (dataId !== value.split("_")[0] ||
				!Object.values(obj["OPTIONS"]["COLUMNS"]).includes(value));
		}
		return false;
	}

	private checkSizeWhereOptionsColumns(JsonObj: any): boolean {
		if (!(Object.keys(JsonObj).includes("OPTIONS")) || !(Object.keys(JsonObj).includes("WHERE"))) {
			return true;
		}
		return !Object.keys(JsonObj["OPTIONS"]).includes("COLUMNS") || !(Object.keys(JsonObj["OPTIONS"]).length <= 2)
			|| (Object.values(JsonObj["OPTIONS"]["COLUMNS"]).length === 0 || !(Object.keys(JsonObj).length === 2));
	}

	private handleLogic(obj: object,initial: boolean): boolean {
		let result = initial;
		for (let j of Object.values(obj)) {
			if (j.length === 0) {
				result = false;
			} else {
				for (let k of j)  {
					result = this.checkFieldInWhere(k,result);
				}
			}
		}
		return result;
	}

	private handleMcomparison(obj: object, initial: boolean): boolean {
		let mfield: string[] = ["avg","pass","fail","audit","year"];
		let result = initial;
		for (let j of Object.values(obj)) {
			if (JSON.stringify(j) === "{}") {
				result = false;
			} else if (mfield.includes(Object.keys(j)[0].split("_")[1])) {
				let key: string = Object.keys(j)[0].split("_")[1];
				for (let k of Object.keys(j)) {
					if (k.split("_")[1] !== key) {
						result = false;
						break;
					}
				}
				if (result) {
					result = (typeof Object.values(j)[Object.keys(j).length - 1] === "number");
				}
			} else {
				result = false;
			}
		}
		return result;
	}

	private handleIS(obj: object, initial: boolean): boolean {
		let sfield: string[] = ["dept","id","instructor","title", "uuid"];
		let result = initial;
		for (let j of Object.values(obj)) {
			if (JSON.stringify(j) === "{}") {
				result = false;
			} else if (sfield.includes(Object.keys(j)[0].split("_")[1])) {
				let key: string = Object.keys(j)[0].split("_")[1];
				for (let k of Object.keys(j)) {
					if (k.split("_")[1] !== key) {
						result = false;
						break;
					}
				}
				if (result) {
					result = (typeof Object.values(j)[0] === "string");
				}
			} else {
				result = false;
			}
		}
		return result;
	}
}
