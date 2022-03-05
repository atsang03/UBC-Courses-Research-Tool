import {InsightError, InsightResult, ResultTooLargeError} from "./IInsightFacade";
import fs from "fs";

export default  class Query {
	private query: unknown;
	constructor(input: unknown) {
		this.query = input;
	}

	public performQuery(): Promise<InsightResult[]> {
		let JsonObj = JSON.parse(JSON.stringify(this.query));
		let result: InsightResult[] = [];
		let rawData = fs.readFileSync("data/data.json").toString();
		const data = JSON.parse(rawData);
		let listOfID: string[] = [];
		if (this.checkSizeWhereOptionsColumns(JsonObj)) {
			return Promise.reject(new InsightError("missing WHERE/OPTIONS/COLUMNS or invalid # of keys in sections"));
		}
		let DataId: string = JSON.parse(JSON.stringify(JsonObj["OPTIONS"]["COLUMNS"]))[0].split("_")[0];
		for (let i of data) {
			listOfID.push(i["dataID"]);
		}
		if (!listOfID.includes(DataId) || this.checkColumnsAndOrderDataSetReferences(JsonObj,DataId)) {
			return Promise.reject(new InsightError("Referencing not yet added Dataset or error in OPTIONS"));
		}
		const wantedFields: string[] = [];
		for (let i of JsonObj["OPTIONS"]["COLUMNS"]) {
			wantedFields.push(i.split("_")[1]);
		}
		if (this.validateWhereSuite(JsonObj,DataId)) {
			return Promise.reject(new InsightError("error in WHERE"));
		}
		if (Object.keys(JsonObj["WHERE"]).length === 0) {
			for (let i of data) {
				if (i["dataID"] === DataId) {
					let obj: InsightResult = this.createInsightResult(i,DataId,wantedFields);
					result.push(obj);
				}
			}
		}
		for (let obj of data) {
			if (this.passesRequirements(obj, JsonObj["WHERE"],true)) {
				result.push(this.createInsightResult(obj, DataId, wantedFields));
			}
		}
		if (result.length > 5000) {
			return Promise.reject(new ResultTooLargeError("Result too large"));
		}
		return Promise.resolve(this.sortBy(result,JsonObj["OPTIONS"]));
	}

	private sortBy(list: InsightResult[], query: any): InsightResult[] {
		if (Object.keys(query).includes("ORDER")) {
			let sorter: string = query["ORDER"];
			return list.sort(function(a,b): number {
				if (a[sorter] > b[sorter]) {
					return 1;
				} else if (a[sorter] < b[sorter]) {
					return -1;
				}
				return 0;
			});
		}
		return list;
	}

	private passesRequirements(obj: any, query: any,initial: boolean): boolean {
		let result: boolean = initial;
		let logic: string[] = ["AND","OR"];
		let mcomparator: string[] = ["EQ","GT","LT"];
		for (let key of Object.keys(query)) {
			if (logic.includes(key)) {
				for (let i of Object.values(query)) {
					result = this.logicHandler(obj,i,key,result);
				}
			} else if (mcomparator.includes(key)) {
				result = this.mcomparatorHandler(obj,Object.values(query),key);
			} else if (key === "NOT") {
				result = !this.passesRequirements(obj,query["NOT"],result);
			} else if (key === "IS") {
				result = this.scomparisonHandler(obj,query["IS"]);
			}
		}
		return result;
	}

	private scomparisonHandler(obj: any, query: any): boolean {
		const skeyField = Object.keys(query)[0].split("_")[1];
		const desiredIs: string = String(Object.values(query)[0]);
		return obj[skeyField] === desiredIs;
	}

	private mcomparatorHandler(obj: any,query: any, key: string): boolean {
		const score: number = Number(Object.values(query[0])[0]);
		if (key === "GT") {
			return obj[Object.keys(query[0])[0].split("_")[1]] > score;
		} else if (key === "EQ") {
			return obj[Object.keys(query[0])[0].split("_")[1]] === score;
		} else {
			return obj[Object.keys(query[0])[0].split("_")[1]] < score;
		}
	}

	private logicHandler(obj: any, query: any, key: string, initial: boolean): boolean {
		let resultList: boolean[] = [];
		let result = initial;
		if (key === "AND") {
			for (let i of query) {
				resultList.push(this.passesRequirements(obj,i,result));
			}
			return resultList.every(Boolean);
		} else {
			for (let i of query) {
				resultList.push(this.passesRequirements(obj,i,result));
			}
			return resultList.includes(true);
		}
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
		let mfield: string[] = ["avg","pass","fail","audit","year"];
		let sfield: string[] = ["dept","id","instructor","title", "uuid"];
		let logic: string[] = ["AND","OR"];
		let mcomparator: string[] = ["EQ","GT","LT"];
		if (result) {
			for (let i of Object.keys(obj)) {
				if (logic.includes(i)) {
					for (let j of Object.values(obj)) {
						for (let k of j)  {
							result = this.checkFieldInWhere(k,result);
						}
					}
				} else if (mcomparator.includes(i)) {
					for (let j of Object.values(obj)) {
						if (mfield.includes(Object.keys(j)[0].split("_")[1])) {
							result = (typeof Object.values(j)[0] === "number");
						} else {
							result = false;
						}
					}
				} else if (i === "IS") {
					for (let j of Object.values(obj)) {
						if (sfield.includes(Object.keys(j)[0].split("_")[1])) {
							result = (typeof Object.values(j)[0] === "string");
						} else {
							result = false;
						}
					}
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
		return !Object.keys(JsonObj["OPTIONS"]).includes("COLUMNS") || !(Object.keys(JsonObj["OPTIONS"]).length <= 2)
			|| (Object.values(JsonObj["OPTIONS"]["COLUMNS"]).length === 0 || !(Object.keys(JsonObj).includes("WHERE"))
				|| !(Object.keys(JsonObj).includes("OPTIONS")) || !(Object.keys(JsonObj).length === 2));
	}

	private createInsightResult(data: any, DataId: string, wantedFields: string[]): InsightResult {
		let result: InsightResult = {};
		for (let i of wantedFields) {
			result[DataId + "_" + i] = data[i];
		}
		return result;
	}
}


