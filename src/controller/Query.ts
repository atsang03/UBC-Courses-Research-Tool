import {InsightError, InsightResult, ResultTooLargeError} from "./IInsightFacade";
import fs from "fs";
import QueryValidator from "./QueryValidator";
import {PerformQuery} from "./PerformQuery";
import PerformQueryTrans from "./PerformQueryTrans";

export default class Query {
	private query: unknown;
	constructor(input: unknown) {
		this.query = input;
	}

	public performQuery(): Promise<InsightResult[]> {
		let jsonObj = JSON.parse(JSON.stringify(this.query));
		if (Object.keys(jsonObj).includes("TRANSFORMATIONS")) {
			let performQueryTrans: PerformQueryTrans = new PerformQueryTrans(jsonObj);
			return performQueryTrans.performQuery();
		} else {
			let performQuery: PerformQuery = new PerformQuery(jsonObj);
			return performQuery.performQuery();
		}
	}
}


