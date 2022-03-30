import {InsightError, InsightResult, ResultTooLargeError} from "./IInsightFacade";
import QueryValidator from "./QueryValidator";
import fs from "fs";
import QueryRequirements from "./QueryRequirements";

export class PerformQuery {

	private query: unknown;
	constructor(input: unknown) {
		this.query = input;
	}

	public performQuery(): Promise<InsightResult[]> {
		let JsonObj = JSON.parse(JSON.stringify(this.query));
		let result: InsightResult[] = [];
		let wantedFields: string[] = [];
		let rawData: string;
		let queryValidator: QueryValidator = new QueryValidator();
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
		let passesRequirements: QueryRequirements = new QueryRequirements();
		for (let obj of data) {
			if (passesRequirements.passesRequirements(obj, JsonObj["WHERE"],true)) {
				result.push(this.createInsightResult(obj, DataId, wantedFields));
			}
		}
		if (result.length > 5000) {
			return Promise.reject(new ResultTooLargeError("Result too large"));
		}
		if (Object.keys(JsonObj["OPTIONS"]).includes("ORDER")) {
			return Promise.resolve(this.sort(result,JsonObj["OPTIONS"]["ORDER"]));
		}
		return Promise.resolve(result);
	}

	private sort(result: InsightResult[],jsonObj: any): InsightResult[] {
		let up: boolean = String(jsonObj["dir"]) === "UP";
		let sortKeys: string[] = jsonObj["keys"];
		if (typeof jsonObj === "string") {
			let sorter: string = jsonObj;
			return result.sort(function(a,b): number {
				if (a[sorter] > b[sorter]) {
					return 1;
				} else if (a[sorter] < b[sorter]) {
					return -1;
				}
				return 0;
			});
		} else {
			result.sort(function(a,b): number {
				let i = 0;
				let res = 0;
				while(i < sortKeys.length && res === 0) {
					if (a[sortKeys[i]] > b[sortKeys[i]]) {
						res = 1;
					} else if (a[sortKeys[i]] < b[sortKeys[i]]) {
						res = -1;
					}
					i++;
				}
				if (up) {
					return res;
				} else {
					return -res;
				}
			});
		}
		return result;
	}

	private createInsightResult(data: any, DataId: string, wantedFields: string[]): InsightResult {
		let result: InsightResult = {};
		for (let i of wantedFields) {
			result[DataId + "_" + i] = data[i];
		}
		return result;
	}
}
