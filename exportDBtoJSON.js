const jsc8 = require("jsc8");
const fs = require("fs");
const { config } = require("process");

///////////////////////////////////// User configuration
const fabricName = "_system"; //
const url = "";
const apiKey = "";
//////////////////////////////////////////
let dataOBJ = new Object();
let configOBJ = new Object();
const client = new jsc8({
  url,
  apiKey,
  fabricName,
});
const sleep = (milliseconds) => {
  console.log(`${milliseconds / 1000} seconds timeout`);
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
};

//Cloning index configuration on backup GF. It only save index configuration.
const cloneIndexes = async function () {
  try {
    const collections = await client.listCollections(true);
    let arr = [];
    for (let i of collections) {
      const collectionIndexes = await client.getCollectionIndexes(i.name);
      for (let i of collectionIndexes) {
        if (
          i.type !== "primary" &&
          i.type !== "edge" &&
          i.fields[0] !== "expireAt"
        ) {
          arr.push(i);
        }
      }
    }
    configOBJ["indexes"] = arr;

    console.log("Index cloning process is DONE!");
  } catch (e) {
    console.log(e);
    console.log("Something went wrong with index cloning process");
  }
};

const cloneCollections = async function () {
  try {
    const collections = await client.listCollections(true);
    configOBJ["collections"] = collections;
    console.log("Collection cloning process id DONE");
  } catch (e) {
    console.log(e);
    console.log(
      "Something went wrong with collection cloning request, please make sure that destination fabric is empty"
    );
  }
};

const pullData = async function () {
  let data = [];
  const batchSize = 1000;
  let collections = await client.listCollections(true);
  collections = collections.filter((item) => item.collectionModel !== "DYNAMO");

  try {
    console.log("Loading data is started!");
    for (let i of collections) {
      //Determining collection size and number of times that we are going to call query
      let name = i.name;
      const { count } = await client.collection(name).count();
      const num = Math.ceil(count / batchSize);

      for (i = 0; i < num; i++) {
        //We change the offset for each iteration
        let offset = i * batchSize;
        //Query part before ${collection_name} and after ${batch Size} can be changed. After ${batchSize} must come Return part of query.
        await sleep(2000);
        query = `FOR doc IN ${name} limit ${offset}, ${batchSize} return doc`;
        const cursor = await client.query(query, {}, { batchSize: batchSize });
        data.push.apply(data, cursor._result);
        console.log(`Collection "${name}" is loading ${i + 1} of ${num}`);
      }
      dataOBJ[name] = data;
      data = [];
    }
    console.log("Data is loaded");
    await sleep(5000);
  } catch (e) {
    console.log("Data cant be loaded");
    console.log(e);
  }
};
const cloneGraph = async function () {
  const graphs = await client.getGraphs();
  const graphlist = [];
  try {
    for (let i of graphs) {
      const graph = await client.getGraph(i.name);
      graphlist.push(graph);
    }
    configOBJ["graph"] = graphlist;
    console.log(`All Graphs are cloned!`);
  } catch (e) {
    console.log("Graph cant be created", e);
    console.log(e);
  }
};
const cloneRestqls = async function () {
  try {
    const listOfCreatedRestql = await client.getRestqls();
    configOBJ["restql"] = listOfCreatedRestql.result;

    console.log("All RESTqls are cloned");
  } catch (e) {
    console.log(e);
    console.log("Something went wrong, RESTqls cant be cloned");
  }
};
const saveDataToFile = function (filename, data) {
  var dir = "./data";

  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir);
  }
  fs.writeFile(
    `./data/${filename}.json`,
    JSON.stringify(data, null, 2),
    (err) => {
      if (err) throw err;
      console.log(`The "${filename}" file has been saved!`);
    }
  );
};
const runInSeries = async () => {
  const list = [
    cloneCollections,
    cloneIndexes,
    cloneRestqls,
    cloneGraph,
    pullData,
  ];
  for (const fn of list) {
    await fn(); // call function to get returned Promise
  }
  saveDataToFile("config", configOBJ);
  saveDataToFile("data", dataOBJ);
};
runInSeries();
