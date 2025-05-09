import { SensorType, Sensor, SensorReading,
	 SensorTypeSearch, SensorSearch, SensorReadingSearch,
       } from './validators.js';

import { Errors, } from 'cs544-js-utils';

import * as mongo from 'mongodb';

/** All that this DAO should do is maintain a persistent data for sensors.
 *
 *  Most routines return an errResult with code set to 'DB' if
 *  a database error occurs.
 */

/** return a DAO for sensors at URL mongodbUrl */
export async function
makeSensorsDao(mongodbUrl: string) : Promise<Errors.Result<SensorsDao>> {
  return SensorsDao.make(mongodbUrl);
}

//the types stored within collections
type DbSensorType = SensorType & { _id: string };
type DbSensor = Sensor & { _id: string };
type DbSensorReading = SensorReading;

//options for new MongoClient()
const MONGO_OPTIONS = {
  ignoreUndefined: true,  //ignore undefined fields in queries
};

export class SensorsDao {

  
  private constructor(
    private readonly client: mongo.MongoClient,
    private readonly sensorTypes: mongo.Collection<DbSensorType>,
    private readonly sensors: mongo.Collection<DbSensor>,
    private readonly sensorReadings: mongo.Collection<DbSensorReading>
  ) {
    //TODO
  }

  /** factory method
   *  Error Codes: 
   *    DB: a database error was encountered.
   */
  static async make(dbUrl: string) : Promise<Errors.Result<SensorsDao>> {
    //takes care of all async ops, then call constructor
    try {
      const client =
	await (new mongo.MongoClient(dbUrl, MONGO_OPTIONS)).connect();
      const db = client.db();
      const sensorTypes = db.collection<DbSensorType>(SENSOR_TYPE_COLLECTION);
      const sensors = db.collection<DbSensor>(SENSOR_COLLECTION);
      const sensorReadings = db.collection<DbSensorReading>(SENSOR_READING_COLLECTION);
      await sensorTypes.createIndex('id');
      await sensors.createIndex('id');

      await sensorReadings.createIndex({ sensorId: 1, timestamp: 1 }, { unique: true });
      await sensorReadings.createIndex({ sensorId: 1 });
      await sensorReadings.createIndex({ timestamp: 1 });

      return Errors.okResult(new SensorsDao(client, sensorTypes, sensors, sensorReadings));
    }
    catch (error) {
      return Errors.errResult('Error while connecting to DB', 'DB');
    }
  }

  /** Release all resources held by this dao.
   *  Specifically, close any database connections.
   *  Error Codes: 
   *    DB: a database error was encountered.
   */
  async close() : Promise<Errors.Result<void>> {
    try {
      await this.client.close();
      return Errors.VOID_RESULT;
    }
    catch (e) {
      return Errors.errResult('Error while closing DB connection', 'DB');
    }
  }

  /** Clear out all sensor info in this database
   *  Error Codes: 
   *    DB: a database error was encountered.
   */
  async clear() : Promise<Errors.Result<void>> {
    try {
      await this.sensorReadings.deleteMany({});
      await this.sensors.deleteMany({});
      await this.sensorTypes.deleteMany({});
      return Errors.VOID_RESULT;
    }
    catch (e) {
      return Errors.errResult('Error while clearing DB', 'DB');
    }
  }


  /** Add sensorType to this database.
   *  Error Codes: 
   *    EXISTS: sensorType with specific id already exists in DB.
   *    DB: a database error was encountered.
   */
  async addSensorType(sensorType: SensorType)
    : Promise<Errors.Result<SensorType>>
  {
    const dbObj = { ...sensorType, _id: sensorType.id, };
    try {
      const collection = this.sensorTypes;
      await collection.insertOne(dbObj);
    }
    catch (e) {
      if (e.code === MONGO_DUPLICATE_CODE) {
        return Errors.errResult('Duplicate Sensor type ID', 'EXISTS');
      } else {
        return Errors.errResult('Error while adding sensorType', 'DB');
      }
    }
    return Errors.okResult(sensorType);
  }

  /** Add sensor to this database.
   *  Error Codes: 
   *    EXISTS: sensor with specific id already exists in DB.
   *    DB: a database error was encountered.
   */
  async addSensor(sensor: Sensor) : Promise<Errors.Result<Sensor>> {
    const dbObj = { ...sensor, _id: sensor.id, };
    try {
      const collection = this.sensors;
      await collection.insertOne(dbObj);
    }
    catch (e) {
      if (e.code === MONGO_DUPLICATE_CODE) {
        return Errors.errResult('Duplicate Sensor ID', 'EXISTS');
      } else {
        return Errors.errResult('Error while adding sensor', 'DB');
      }
    }
    return Errors.okResult(sensor);
  }

  /** Add sensorReading to this database.
   *  Error Codes: 
   *    EXISTS: reading for same sensorId and timestamp already in DB.
   *    DB: a database error was encountered.
   */
  async addSensorReading(sensorReading: SensorReading)
    : Promise<Errors.Result<SensorReading>> 
  {
    const dbObj = { ...sensorReading };
    try {
      const collection = this.sensorReadings;
      await collection.insertOne(dbObj);
    }
    catch (e) {
      if (e.code === MONGO_DUPLICATE_CODE) {
        return Errors.errResult('Duplicate Sensor ID and timestamp', 'EXISTS');
      } else {
        return Errors.errResult('Error while adding sensor reading', 'DB');
      }
    }
    return Errors.okResult(sensorReading);
  }

  /** Find sensor-types which satify search. Returns [] if none. 
   *  Note that all primitive SensorType fields can be used to filter.
   *  The returned array must be sorted by sensor-type id.
   *  Error Codes: 
   *    DB: a database error was encountered.
   */
  async findSensorTypes(search: SensorTypeSearch)
    : Promise<Errors.Result<SensorType[]>> 
  {
    try {
      const collection = this.sensorTypes;
      const projection = { _id: false };
      const sensorType = await collection.find({...search, _id: search.id}, {projection}).toArray();
      if (sensorType) {
	      return Errors.okResult(sensorType);
      }
      else {
	      return Errors.errResult(`No sensor type for id '${search.id}'`,{ code: 'NOT_FOUND' });
      }
    }
    catch (e) {
      return Errors.errResult('Error while finding sensor type', 'DB');
    }
  }
  
  /** Find sensors which satify search. Returns [] if none. 
   *  Note that all primitive Sensor fields can be used to filter.
   *  The returned array must be sorted by sensor-type id.
   *  Error Codes: 
   *    DB: a database error was encountered.
   */
  async findSensors(search: SensorSearch) : Promise<Errors.Result<Sensor[]>> {
    try {
      const collection = this.sensors;
      const projection = { _id: false };
      const sensors = await collection.find({...search, _id: search.id}, {projection}).toArray();
      if (sensors) {
	      return Errors.okResult(sensors);
      }
      else {
	      return Errors.errResult(`No sensor type for id '${search.id}'`,{ code: 'NOT_FOUND' });
      }
    }
    catch (e) {
      return Errors.errResult('Error while finding sensor', 'DB');
    }
  }

  /** Find sensor readings which satisfy search. Returns [] if none. 
   *  The returned array must be sorted by timestamp.
   *  Error Codes: 
   *    DB: a database error was encountered.
   */
  async findSensorReadings(search: SensorReadingSearch)
    : Promise<Errors.Result<SensorReading[]>> 
  {
    try {
      const collection = this.sensorReadings;
      const projection = { _id: false };
      const query = this.getFindSensorReadingsQuery(search);
      const sensorReadings = await collection.find(query, {projection}).sort({_id: 1}).toArray();
      if (sensorReadings) {
	      return Errors.okResult(sensorReadings);
      }
      else {
	      return Errors.errResult(`No sensor reading for sensor id '${search.sensorId}'`,{ code: 'NOT_FOUND' });
      }
    }
    catch (e) {
      return Errors.errResult('Error while finding sensor', 'DB');
    }
  }

  getFindSensorReadingsQuery(search: SensorReadingSearch): SensorReadingQuery {
    const query: SensorReadingQuery = {};
    if(search.sensorId) {
      query.sensorId = search.sensorId;
    }
    if(search.minTimestamp !== undefined) {
      query.timestamp = {'$gte': search.minTimestamp};
    }
    if(search.maxTimestamp !== undefined) {
      query.timestamp = {...query.timestamp, '$lte': search.maxTimestamp};
    }
    if(search.minValue !== undefined) {
      query.value = {'$gte': search.minValue};
    }
    if(search.maxValue !== undefined) {
      query.value = {...query.value, '$lte': search.maxValue};
    }
    return query;
  }
  
} //SensorsDao

//mongo err.code on inserting duplicate entry
const MONGO_DUPLICATE_CODE = 11000;
const SENSOR_TYPE_COLLECTION = 'sensor_type';
const SENSOR_COLLECTION = 'sensor';
const SENSOR_READING_COLLECTION = 'sensor_reading';

export interface SensorReadingQuery {
  sensorId?: string;
  timestamp?: {[key: string]: number};
  value?: {[key: string]: number};
}


