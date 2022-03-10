import {InsightError, InsightResult, ResultTooLargeError} from "./IInsightFacade";
import fs from "fs";
import QueryValidator from "./QueryValidator";

export default  class Query {
	private query: unknown;
	constructor(input: unknown) {
		this.query = input;
	}

	public performQuery(): Promise<InsightResult[]> {
		let JsonObj = JSON.parse(JSON.stringify(this.query));
		let result: InsightResult[] = [];
		// let rawData = fs.readFileSync("data/data.json").toString();
		// const data = JSON.parse(rawData);
		let wantedFields: string[] = [];
		let rawData: string;
		let queryValidator: QueryValidator = new QueryValidator(JsonObj,wantedFields);
		if (queryValidator.validation(JsonObj,wantedFields)) {
			return Promise.reject(new InsightError());
		}
		let DataId: string = JSON.parse(JSON.stringify(JsonObj["OPTIONS"]["COLUMNS"]))[0].split("_")[0];
		if (!(fs.existsSync(`data/${DataId}`))) {
			return Promise.reject(new InsightError());
		}
		rawData = fs.readFileSync(`data/${DataId}`).toString();
		const data = JSON.parse(rawData);
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
		if ((JSON.stringify(Object.values(query)[0]).match(/[*]/g) || []).length === 1) {
			if (Object.values(query)[0] === "*") {
				return true;
			} else if (String(Object.values(query)[0])[0] === "*") {
				let endLength: number = String(Object.values(query)[0]).split("*")[1].length;
				let endOfObj = String(obj[skeyField]).substring(String(obj[skeyField]).length - endLength);
				return endOfObj === String(Object.values(query)[0]).split("*")[1];
			} else {
				let beginLength: number = String(Object.values(query)[0]).split("*")[0].length;
				let beginOfObj = String(obj[skeyField]).substring(0,beginLength);
				return beginOfObj === String(Object.values(query)[0]).split("*")[0];
			}
		} else if ((JSON.stringify(Object.values(query)[0]).match(/[*]/g) || []).length === 2) {
			if (Object.values(query)[0] === "**") {
				return true;
			} else {
				return String(obj[skeyField]).includes(String(Object.values(query)[0]).split("*")[1]);
			}
		}
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


	private createInsightResult(data: any, DataId: string, wantedFields: string[]): InsightResult {
		let result: InsightResult = {};
		for (let i of wantedFields) {
			result[DataId + "_" + i] = data[i];
		}
		return result;
	}
}


