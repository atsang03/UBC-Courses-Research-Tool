import Server from "../../src/rest/Server";
import InsightFacade from "../../src/controller/InsightFacade";
import {expect, use} from "chai";
import chaiHttp from "chai-http";
import * as fs from "fs-extra";

describe("Facade D3", function () {
	let insightFacade: InsightFacade;
	const persistDir = "./data/data";
	let facade: InsightFacade;
	let server: Server;
	const datasetContents = new Map<string, string>();

	// Reference any datasets you've added to test/resources/archives here and they will
	// automatically be loaded in the 'before' hook.
	const datasetsToLoad: {[key: string]: string} = {
		courses: "./test/resources/archives/courses.zip",
		rooms: "./test/resources/archives/rooms.zip"
	};
	use(chaiHttp);

	before(function () {
		facade = new InsightFacade();
		server = new Server(4321);
		// TODO: start server here once and handle errors properly
		for (const key of Object.keys(datasetsToLoad)) {
			const content = fs.readFileSync(datasetsToLoad[key]).toString("base64");
			datasetContents.set(key, content);
		}
		// Just in case there is anything hanging around from a previous run
		fs.removeSync(persistDir);
	});

	after(function () {
		// TODO: stop server here once!
	});

	beforeEach(function () {
		// might want to add some process logging here to keep track of what"s going on
	});

	afterEach(function () {
		// might want to add some process logging here to keep track of what"s going on
	});

	// Sample on how to format PUT requests

	it("PUT test for courses dataset", function () {
		try {
			const content: string = datasetContents.get("courses") ?? "";
			// console.log(content);
			return chai.request("http://localhost:4321")
				.put("/dataset/:id/:kind")
				.send(content)
				.set("Content-Type", "application/x-zip-compressed")
				.then(function (res: ChaiHttp.Response) {
					// some logging here please!
					console.log("test2");
					expect(res.status).to.be.equal(200);
				})
				.catch(function (err) {
					// some logging here please!
					console.log("test");
					expect.fail(err);
				});
		} catch (err) {
			// and some more logging here!
		}
	});

	// The other endpoints work similarly. You should be able to find all instructions at the chai-http documentation
});
