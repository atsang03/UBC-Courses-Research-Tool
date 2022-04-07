let request = new XMLHttpRequest();
document.getElementById("btn").addEventListener("click", handleClickMe);
let resultLocation = document.getElementById("posting");
function handleClickMe() {
	let data = document.getElementById("input").value;
	renderHTML(data);
	alert("Getting Result... Press OK to continue");
}

function renderHTML(data) {
	resultLocation.insertAdjacentHTML("beforeend",data);
}

