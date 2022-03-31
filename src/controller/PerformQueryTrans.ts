import {InsightError, InsightResult, ResultTooLargeError} from "./IInsightFacade";
import QueryValidatorTrans from "./QueryValidatorTrans";
import fs from "fs";
import Decimal from "decimal.js";
import Query from "./Query";
import QueryRequirements from "./QueryRequirements";

export default class PerformQueryTrans {
	private query: unknown;
	constructor(input: unknown) {
		this.query = input;
	}

	public performQuery(): Promise<InsightResult[]> {
		let jsonObj = JSON.parse(JSON.stringify(this.query));
		let query: InsightResult[] = [];
		let result: InsightResult[] = [];
		let rawData: string;
		let queryValidatorTrans: QueryValidatorTrans = new QueryValidatorTrans();
		if (queryValidatorTrans.validation(jsonObj)) {
			return Promise.reject(new InsightError());
		}
		let dataId: string = String(jsonObj["TRANSFORMATIONS"]["GROUP"][0]).split("_")[0];
		if (!(fs.existsSync(`data/${dataId}`))) {
			return Promise.reject(new InsightError());
		}
		rawData = fs.readFileSync(`data/${dataId}`).toString();
		const data = JSON.parse(rawData);
		const groupFields: string[] = jsonObj["TRANSFORMATIONS"]["GROUP"];
		const requiredFields: string[] = [];
		const columnFields: string[] = [];
		let applyNames: string[] = [];
		let applyFunctions: string[] = [];
		let applyValues: string[] = [];
		for (let obj of jsonObj["TRANSFORMATIONS"]["GROUP"]) {
			requiredFields.push(obj);
		}
		for (let obj of jsonObj["OPTIONS"]["COLUMNS"]) {
			columnFields.push(obj);
		}
		this.getApplyValues(jsonObj,applyNames,applyFunctions,applyValues,requiredFields);
		if (Object.keys(jsonObj["WHERE"]).length === 0) {
			for (let i of data) {
				query.push(this.createInsightResult(i,requiredFields));
			}
		}
		let passesRequirements: QueryRequirements = new QueryRequirements();
		for (let obj of data) {
			if (passesRequirements.passesRequirements(obj, jsonObj["WHERE"],true)) {
				query.push(this.createInsightResult(obj,requiredFields));
			}
		}
		let grouped: any = this.groupBy(query,groupFields);
		result = this.apply(result,grouped,applyNames,applyFunctions,applyValues,columnFields,groupFields);
		if (result.length > 5000) {
			return Promise.reject(new ResultTooLargeError("Result too large"));
		}
		if (Object.keys(jsonObj["OPTIONS"]).includes("ORDER")) {
			return Promise.resolve(this.sort(result,jsonObj["OPTIONS"]["ORDER"]));
		}
		return Promise.resolve(result);
	}

	private getApplyValues(jsonObj: any, applyN: string[],applyF: string[], applyV: string[],r: string[]): boolean {
		for (let obj of jsonObj["TRANSFORMATIONS"]["APPLY"]) {
			applyN.push(Object.keys(obj)[0]);
			applyF.push(Object.keys(obj[Object.keys(obj)[0]])[0]);
			applyV.push(String(Object.values((obj[Object.keys(obj)[0]]))[0]));
			if (!r.includes(String(Object.values(obj[Object.keys(obj)[0]])[0]))) {
				r.push(String(Object.values(obj[Object.keys(obj)[0]])[0]));
			}
		}
		return true;
	}

	private createInsightResult(data: any, wantedFields: string[]): InsightResult {
		let result: InsightResult = {};
		for (let i of wantedFields) {
			let field: string = i.split("_")[1];
			result[i] = data[field];
		}
		return result;
	}

	private groupBy(query: InsightResult[],testFields: string[]): any {
		let group: any = {};
		let first = query[0];
		let objVal: string = "";
		testFields.forEach((element) => {
			objVal = objVal + first[element];
		});
		let firstVal = objVal;
		group[firstVal] = (group[firstVal] || []).concat(first);
		query.reduce((prev,obj) => {
			objVal = "";
			testFields.forEach((element) => {
				objVal = objVal + obj[element];
			});
			let value = objVal;
			group[value] = (group[value] || []).concat(obj);
			return group;
		});
		return group;
	}

	private apply
	(result: InsightResult[], grouped: any, N: string[], F: string[], V: string[],cols: string[],G: string[]):
		InsightResult[] {
		let val;
		Object.values(grouped).forEach((obj) => {
			let firstElement: any = this.getFirstElement(obj);
			let resultObj: InsightResult = {};
			let tempObj: InsightResult = {};
			for (let property of G) {
				tempObj[property] = firstElement[property];
			}
			for (let i = 0; i < F.length; i++) {
				if (F[i] === "MAX") {
					val = this.getMax(obj,V[i]);
					tempObj[N[i]] = val;
				} else if (F[i] === "MIN") {
					val = this.getMin(obj,V[i]);
					tempObj[N[i]] = val;
				} else if (F[i] === "AVG") {
					val = this.getAvg(obj,V[i]);
					tempObj[N[i]] = val;
				} else if (F[i] === "COUNT") {
					val = this.getCount(obj,V[i]);
					tempObj[N[i]] = val;
				} else if (F[i] === "SUM") {
					val = this.getSum(obj,V[i]);
					tempObj[N[i]] = val;
				}
			}
			result.push(this.createTransResult(resultObj,tempObj,cols));
		});
		return result;
	}

	private createTransResult(resultObj: InsightResult, tempObj: InsightResult, cols: string[]): InsightResult {
		for (let property of cols) {
			resultObj[property] = tempObj[property];
		}
		return resultObj;
	}

	private getFirstElement(obj: any): any {
		return obj[0];
	}

	private getAvg(jsonObj: any, value: string): number {
		let total: Decimal = new Decimal(0);
		let numRows: number = 0;
		for (let obj of jsonObj) {
			total.add(new Decimal(obj[value]));
			numRows++;
		}
		let avg = (total.toNumber() / numRows);
		return Number(avg.toFixed(2));
	}

	private getMax(jsonObj: any, value: string): number  {
		let max = 0;
		for (let obj of jsonObj) {
			if (max < obj[value]) {
				max = obj[value];
			}
		}
		return max;
	}

	private getMin(jsonObj: any, value: string): number  {
		let min = 100;
		for (let obj of jsonObj) {
			if (min > obj[value]) {
				min = obj[value];
			}
		}
		return min;
	}

	private getSum(obj: any, value: string): number  {
		let sum: number = 0;
		for (let ob of obj) {
			sum += obj[value];
		}
		return Number(sum.toFixed(2));
	}

	private getCount(obj: any, value: string): number {
		let counted: string[] = [];
		for (let ob of obj) {
			if (!counted.includes(ob[value])) {
				counted.push(ob[value]);
			}
		}
		return counted.length;
	}

	private sort(result: InsightResult[],jsonObj: any): InsightResult[] {
		let up: boolean = String(jsonObj["dir"]) === "UP";
		let sortKeys: string[] = jsonObj["keys"];
		if (typeof jsonObj === "string") {
			let sorter: string = jsonObj;
			return result.sort(function(a,b): number {
				let res = 0;
				if (a[sorter] > b[sorter]) {
					res = 1;
				} else if (a[sorter] < b[sorter]) {
					res = -1;
				}
				if (up) {
					return res;
				}
				return -res;
			});
		} else {
			result.sort(function(a,b): number {
				let i = 0;
				let res = 0;
				while(i < sortKeys.length && res === 0) {
					console.log("test");
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
}
