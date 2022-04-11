Temporary BackUp solution

- Script app.js

Script app.js will create a new GeoFabric on the destination tenant, clone all data and configuration from the source tenant, and save it to destination GF. This should be a temporary solution for quick backup recovery. This script aims to create production DB clones every day so that production DB can be quickly recovered if necessary.
The script is designed for execution once daily.
Script function:

1. Create GeoFabric on the destination tenant
2. Cloning data and configuration of collection.
3. Saving all indexes configuration in a collection called indexes
4. Saving all graphs configuration in a collection called graphs
5. Cloning rentals
6. Deleting GF backups older than ten days

There is two way to use backup fabrics.
1. To quickly recover, it can become a replacement for production fabric. To do that, the user simply needs to change the current URL for Backup GeoFabric URL and run the script recreateIndexesAndGraphs.js that will recreate indexes and graphs.
2. Run reverse clone script to wipe production fabric and then clone data and configuration from backup fabric.


- exportDBtoJSON.js

exportDBtoJSON.js will export all data from fabric to a JSON file called data.json and all configurations in config.json.

1. data.json structure will be:
   {
   collectionName:[......],
   collectionName2:[......],
   .
   .
   .
   }
2. config.json structure will be:
   {
   collections:[collection configuration],
   indexes: [indexes configuration],
   graphs: [graphs configuration]
   restqls: [restqls configuration]
   }

This script aims to create backups files that can be stored on other storing platforms.
