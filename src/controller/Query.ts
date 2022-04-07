import {InsightError, InsightResult, ResultTooLargeError} from "./IInsightFacade";
import fs from "fs";
import QueryValidator from "./QueryValidator";
import {PerformQuery} from "./PerformQuery";
import PerformQueryTrans from "./PerformQueryTrans";
import InsightFacade from "./InsightFacade";

export default class Query {
	private query: unknown;
	constructor(input: unknown) {
		this.query = input;
	}

	public performQuery(): Promise<InsightResult[]> {
		let jsonObj = JSON.stringify(this.query);
		try {
			jsonObj = JSON.parse(jsonObj);
		} catch (e) {
			return Promise.reject(new InsightError());
		}
		if (Object.keys(jsonObj).includes("TRANSFORMATIONS")) {
			let performQueryTrans: PerformQueryTrans = new PerformQueryTrans(jsonObj);
			return performQueryTrans.performQuery();
		} else {
			let performQuery: PerformQuery = new PerformQuery(jsonObj);
			return performQuery.performQuery();
		}
	}
}


