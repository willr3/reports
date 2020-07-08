# make reports to to share charts


## Build for docker
tested with Docker version 19.03.8
```bash
docker build -f Dockerfile -t report .
docker volume create reports
docker run --name my_report -p 3030:3001 -e DATA_PATH=/tmp/data -v reports:/tmp/data -d report
```
## Build to run and test locally
```bash
PUBLIC_URL='/' webpack --config webpack.server.js
DATA_PATH="/tmp/data" node build/server.prod.js #starts the backend
npm run start #runs the react hot-reload server
```

Then the UI is available at `localhost:3030`
report categories
* coldStart
* createNamespace
* hyperfoil
* specjEnterprise
* techempower
* webProfile

upload
```bash
curl -X POST -H "Content-Type: application/json" -d @/tmp/ns/20200706_112845.json "http://laptop:3000/api/data/createNamespace/20200706_112845.json
```


npx babel-node generate-pdf.js http://hostName:3030 ./webprofile.pdf
