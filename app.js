const jsc8 = require("jsc8");
///////////////////////////////////// User configuration
const fabricName = "_system";
const url = ""; //federation URL
const apiKey1 = "";   //API key of source tenant
const apiKey2 = "";   //API key of destination tenant
const apiKey2ID = ""; //ID of APIkey2/ name of API key
//////////////////////////////////////////
let newGFname = "";

//Connection to source and destination tenant
const client1 = new jsc8({
  url,
  apiKey: apiKey1,
  fabricName,
});
const client2 = new jsc8({
  url,
  apiKey: apiKey2,
  fabricName,
});

//Timeout function, safety measure for slowing down cloning process
const sleep = (milliseconds) => {
  console.log(`${milliseconds / 1000} seconds timeout`);
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
};

//Creating GeoFabric and giving APIkey permission that it can access it
const createGF = async function () {
  try {
    const data = await client2.getAllEdgeLocations();
    let locations = "";
    newGFname =
      new Date(Date.now()).toString().replace(/\s/g, "-").slice(4, 15) +
      "_" +
      Date.now().toString();
    for (let i of data) {
      locations = locations + "," + i._key;
    }
    const info = await client2.createFabric(newGFname, ["root"], {
      dcList: locations.slice(1),
    });
    const result = await client2.setDatabaseAccessLevel(
      apiKey2ID,
      newGFname,
      "rw"
    );
    client2.useFabric(newGFname);
    console.log("GeoFabric is created!");
    await sleep(2000);
  } catch (e) {
    console.log(e);
    console.log(
      "Something went wrong in GF creating process, check the error log."
    );
  }
};

//Cloning index configuration on backup GF. It only save index configuration.
const cloneIndexes = async function () {
  try {
    const collections = await client2.listCollections(true);
    let arr = [];
    for (let i of collections) {
      const collectionIndexes = await client1.getCollectionIndexes(i.name);
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
    client2.createCollection("indexes");
    const insertedDocs = await client2.insertDocumentMany("indexes", arr);
    console.log("Index cloning process is DONE!");
  } catch (e) {
    console.log("Something went wrong with index cloning process");
    console.log(e.response.body);
  }
};
//This function will clone the collections to destination fabric; This function do not clone data
const cloneCollections = async function () {
  const collections = await client1.listCollections(true);
  try {
    for (let i of collections) {
      if (i.collectionModel === "DOC") {
        if (i.type === 2) {
          await client2.createCollection(i.name, {
            stream: i.hasStream ? true : false,
          });
        } else {
          await client2.createCollection(
            i.name,
            { stream: i.hasStream ? true : false },
            { isEdge: true }
          );
        }
      } else if (i.collectionModel === "KV") {
        const result = await client2.createKVCollection(i.name, {
          expiration: true,
          stream: i.hasStream ? true : false,
        });
      } else if (i.collectionModel === "DYNAMO") {
        console.log(
          `"${i.name}" DYNAMO collection is not cloned, there is no driver support for this type of collection`
        );
      } else {
        console.log("I dont know this type");
      }
    }
    console.log("Collection cloning process id DONE");
  } catch (e) {
    console.log(
      "Something went wrong with collection cloning request, please make sure that destination fabric is empty"
    );
    console.log(e.response.body);
  }
};

//Cloning data
const cloneData = async function () {
  const batchSize = 1000;
  let collections = await client1.listCollections(true);
  collections = collections.filter((item) => item.collectionModel !== "DYNAMO");

  try {
    for (let i of collections) {
      let name = i.name;
      const { count } = await client1.collection(name).count();
      const num = Math.ceil(count / batchSize);
      for (i = 0; i < num; i++) {
        //We change the offset for each iteration
        let offset = i * batchSize;
        await sleep(100);
        let cursor = await client1.exportDataByCollectionName(name, {
          offset: offset,
          limit: batchSize,
        });
        console.log(
          `Data pulled from source fabric, collection ${name}, ${i + 1} of ${num}, server code: ${
            cursor.code
          }`
        );
        await sleep(200);
        let insert = await client2.importDocuments(
          name,
          cursor.result,
          true,
          "_key",
          true
        );
        console.log(
          `Data inserted in destination fabric, collection ${name}, ${i + 1} of ${num} >>> created: ${
            insert.result.created
          }`
        );
      }
    }
  } catch (e) {
    console.log(e);
    console.log("There is error in data cloning process");

  }
  console.log("Cloning process is finished",newGFname);
};

//Cloning graphs configuration on backup GF. It only save graphs configuration into graphs collection.
const cloneGraph = async function () {
  const graphs = await client1.getGraphs();
  let arr = [];
  try {
    for (let i of graphs) {
      const graph = await client1.getGraph(i.name);
      arr.push(graph);
    }
    await client2.createCollection("graphs");
    const insertedDocs = await client2.insertDocumentMany("graphs", arr);
    console.log(`All Graphs are cloned!`);
  } catch (e) {
    console.log("Graph cant be created", e);
    console.log(e);
  }
};

//This function will clone restqls
const cloneRestqls = async function () {
  try {
    const listOfCreatedRestql = await client1.getRestqls();
    for (let i of listOfCreatedRestql.result) {
      await client2.createRestql(i.name, i.value);
    }
    console.log("All RESTqls are cloned");
  } catch (e) {
    console.log(e);
    console.log("Something went wrong, RESTqls cant be cloned");
  }
};

// 10 days is  ~900 000 000 ms, this function will deleted all GF that are older than 10 days.
const deletingOldVersionOfGF = async function () {
  let timeToDelete = 900000000; //in ms = ~10 days
  try {
    client2.useFabric(fabricName);

    const fabrics = await client2.listUserFabrics();
    for (let i of fabrics) {
      if (i.isSystem == false) {
        let nameOfGF = i.name.split("_")[1];
        let check = Date.now().toString() - nameOfGF;
        if (check > timeToDelete) {
          client2.useFabric(fabricName);
          await client2.dropFabric(i.name);
          console.log(`"${i.name}" GeoFabric is deleted`);
        }
      }
    }
  } catch (e) {
    console.log(e);
    console.log("Something went wrong with GeoFabric deleting process");
  }
};

const runInSeries = async () => {
  const list = [
    createGF,
    cloneCollections,
    cloneIndexes,
    cloneRestqls,
    cloneGraph,
    cloneData,
    deletingOldVersionOfGF,
  ];
  for (const fn of list) {
    await fn(); // call function to get returned Promise
  }
};
runInSeries();
