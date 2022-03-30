export default class QueryRequirements {

	public passesRequirements(obj: any, query: any,initial: boolean): boolean {
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
}
