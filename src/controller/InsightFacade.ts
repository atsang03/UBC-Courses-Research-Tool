import JSZip, {loadAsync} from "jszip";
import {IInsightFacade, InsightDataset, InsightDatasetKind, InsightError,
	InsightResult, NotFoundError, ResultTooLargeError} from "./IInsightFacade";
import Section from "./Section";
import * as fs from "fs";

export default class InsightFacade implements IInsightFacade {
	private datasetList: any[] = [];
	private secList: any[] = [];
	public async addDataset(id: string, content: string, kind: InsightDatasetKind): Promise<string[]> {
		if (id.includes("_")) {
			throw new InsightError("invalid id");
		}
		let idList: string[] = [];
		let promises: Array<Promise<any>> = [];
		let zip = new JSZip();
		let counter: number = 0;
		const aPromise = await zip.loadAsync(content, {base64: true});
		aPromise.folder("courses")?.forEach((async (relativePath, file) => {
			let jFile: any;
			promises.push(file.async("string").then((filecontent) => {
				jFile = JSON.parse(filecontent);
				for (const element of  jFile.result) {
					if (element.Section !== null) {
						counter++;
						this.secList.push(new Section(element.Subject, element.Course, element.Avg,
							element.Professor, element.Title, element.Pass, element.Fail, element.Audit,
							element.id, element.Year, id));
					}
				}
			}));
		}));
		await aPromise;
		await Promise.all(promises);
		this.datasetList.push({id: id, kind: kind, numRows: counter});
		this.datasetList.forEach((element) => idList.push(element.id));
		const json = JSON.stringify(this.secList);
		fs.writeFileSync("data.json" ,json);
		return Promise.resolve(idList);
	}

	public listDatasets(): Promise<InsightDataset[]> {
		return Promise.resolve(this.datasetList);
	}

	public performQuery(query: unknown): Promise<InsightResult[]> {
		let JsonObj = JSON.parse(JSON.stringify(query));
		let result: InsightResult[] = [];
		let rawData = fs.readFileSync("data.json").toString();
		const data = JSON.parse(rawData);
		if (this.checkSizeWhereOptionsColumns(JsonObj)) {
			return Promise.reject(new InsightError("missing WHERE/OPTIONS/COLUMNS or invalid # of keys in sections"));
		}
		let DataId: string = JSON.parse(JSON.stringify(JsonObj["OPTIONS"]["COLUMNS"]))[0].split("_")[0];
		if (this.checkColumnsAndOrderDataSetReferences(JsonObj,DataId)) {
			return Promise.reject(new InsightError("Error in OPTIONS"));
		}
		const wantedFields: string[] = this.getWantedFields(JsonObj["OPTIONS"]["COLUMNS"]);
		if (Object.keys(JsonObj["WHERE"]).length === 0) {
			for (let i of data) {
				if (i["dataID"] === DataId) {
					let obj: InsightResult = this.createInsightResult(i,DataId,wantedFields);
					result.push(obj);
				}
			}
		}
		if (this.validateWhereSuite(JsonObj,DataId)) {
			return Promise.reject(new InsightError("error in WHERE"));
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
				}
				if (a[sorter] < b[sorter]) {
					return -1;
				}
				return 0;
			});
		}
		return list;
	}

	public removeDataset(id: string): Promise<string> {
		if (id.includes("_")) {
			throw new InsightError("invalid id");
		}
		if (this.datasetList.every((element) => {
			return !(element.id === id);
		})) {
			throw new NotFoundError("No dataset with this id found");
		}
		this.datasetList.forEach((element) => {
			if (element.id === id) {
				element.remove();
			}
		}
		);
		this.secList.forEach((element) => {
			if (element.dataID === id) {
				element.remove();
			}
		});
		return Promise.resolve(id);
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
		if (obj[skeyField] === desiredIs) {
			return true;
		}
		return false;
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
		return false;
	}

	private logicHandler(obj: any, query: any, key: string, initial: boolean): boolean {
		let resultList: boolean[] = [];
		let result = initial;
		if (key === "AND") {
			for (let i of query) {
				resultList.push(this.passesRequirements(obj,i,result));
			}
			result = resultList.every(Boolean);
		} else if (key === "OR") {
			for (let i of query) {
				resultList.push(this.passesRequirements(obj,i,result));
			}
			result = resultList.includes(true);
		}
		return result;
	}

	private validateWhereSuite(obj: object, dataId: string): boolean {
		let JsonObj = JSON.parse(JSON.stringify(obj));
		if (!this.referenceOnlyOneDataSet(JsonObj["WHERE"],dataId,true)) {
			return true;
		}
		if(!this.checkFieldInWhere(JsonObj["WHERE"],true)) {
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
		}
		if (result) {
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
			if (dataId !== value.split("_")[0] || !Object.values(obj["OPTIONS"]["COLUMNS"]).includes(value)) {
				return true;
			}
		}
		return false;
	}

	private checkSizeWhereOptionsColumns(JsonObj: any): boolean {
		if (!(Object.keys(JsonObj).includes("WHERE")) || !(Object.keys(JsonObj).includes("OPTIONS"))
			|| !(Object.keys(JsonObj).length === 2)
		) {
			return true;
		}
		if(!Object.keys(JsonObj["OPTIONS"]).includes("COLUMNS") || !(Object.keys(JsonObj["OPTIONS"]).length <= 2)
			|| (Object.values(JsonObj["OPTIONS"]["COLUMNS"]).length === 0)) {
			return true;
		}
		return false;
	}

	private getWantedFields(obj: string[]): string[] {
		let result: string[] = [];
		for (let i of obj) {
			result.push(i.split("_")[1]);
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
