let request = new XMLHttpRequest();
document.getElementById("btn").addEventListener("click", handleClickMe);
let resultLocation = document.getElementById("posting");
function handleClickMe() {
	let data = document.getElementById("input").value;
	let test = {
		"WHERE": {
			"GT":{
				"courses_avg":97
			}
		},
		"OPTIONS": {
			"COLUMNS": [
				"courses_dept",
				"courses_avg"
			],
			"ORDER": "courses_avg"
		}
	}
	options = {
		method: "POST",
		body: test
	}
	fetch("/query",options).then((res) => {
		console.log(res.body);
	})
	alert("Getting Result... Press OK to continue");
}

function renderHTML(data) {
	resultLocation.insertAdjacentHTML("beforeend",data);
}

