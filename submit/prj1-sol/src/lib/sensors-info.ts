import { Errors, Checkers } from 'cs544-js-utils';
import { validateFindCommand, SensorType, Sensor, SensorReading,
	 makeSensorType, makeSensor, makeSensorReading 
       } from './validators.js';

type FlatReq = Checkers.FlatReq; //dictionary mapping strings to strings

//marks T as having being run through validate()
type Checked<T> = Checkers.Checked<T>;

/*********************** Top Level Sensors Info ************************/

export class SensorsInfo {

  //TODO: define instance fields; good idea to keep private and
  //readonly when possible.

  private sensorTypes: { [key: string]: SensorType };
  private sensors: { [key: string]: Sensor };
  private sensorReadings: { [key: string]: SensorReading[] };

  constructor() {
    //TODO
    this.sensorTypes = {};
    this.sensors = {};
    this.sensorReadings = {};
  }

  /** Clear out all sensors info from this object.  Return empty array */
  clear() : Errors.Result<string[]> {
    //TODO
    this.sensorTypes = {};
    this.sensors = {};
    this.sensorReadings = {};
    return Errors.okResult([]);
  }

  /** Add sensor-type defined by req to this.  If there is already a
   *  sensor-type having the same id, then replace it. Return single
   *  element array containing the added sensor-type.
   *
   *  Error Codes:
   *     'REQUIRED': a required field is missing.
   *     'BAD_VAL': a bad value in a field (a numeric field is not numeric)
   *     'BAD_RANGE': an incorrect range with min >= max.
   */
  addSensorType(req: Record<string, string>) : Errors.Result<SensorType[]> {
    const sensorTypeResult = makeSensorType(req);
    if (!sensorTypeResult.isOk) return sensorTypeResult;
    const sensorType = sensorTypeResult.val;
    //TODO add into this
    this.sensorTypes[sensorType.id] = sensorType;
    return Errors.okResult([sensorType]);
  }
  
  /** Add sensor defined by req to this.  If there is already a 
   *  sensor having the same id, then replace it.  Return single element
   *  array containing the added sensor.
   *
   *  Error Codes:
   *     'REQUIRED': a required field is missing.
   *     'BAD_VAL': a bad value in a field (a numeric field is not numeric)
   *     'BAD_RANGE': an incorrect range with min >= max.
   *     'BAD_ID': unknown sensorTypeId.
   */
  addSensor(req: Record<string, string>): Errors.Result<Sensor[]> {
    //TODO
    const sensorResult = makeSensor(req);
    if (!sensorResult.isOk) return sensorResult;
    const sensor = sensorResult.val;
    if(this.sensorTypes[sensor.sensorTypeId]) {
      if(sensor.expected.isSubrange(this.sensorTypes[sensor.sensorTypeId].limits)) {
        this.sensors[sensor.id] = sensor;
        return Errors.okResult([sensor]);
      } else {
        return Errors.errResult('must detect expected range inconsistent with sensor-type', 'BAD_RANGE');
      }
    } else {
      return Errors.errResult('must detect bad sensor-type ID', 'BAD_ID');
    } 
  }

  /** Add sensor reading defined by req to this.  If there is already
   *  a reading for the same sensorId and timestamp, then replace it.
   *  Return single element array containing added sensor reading.
   *
   *  Error Codes:
   *     'REQUIRED': a required field is missing.
   *     'BAD_VAL': a bad value in a field (a numeric field is not numeric)
   *     'BAD_RANGE': an incorrect range with min >= max.
   *     'BAD_ID': unknown sensorId.
   */
  addSensorReading(req: Record<string, string>)
    : Errors.Result<SensorReading[]> 
  {
    //TODO
    const sensorReadingResult = makeSensorReading(req);
    if (!sensorReadingResult.isOk) return sensorReadingResult;
    const sensorReading = sensorReadingResult.val;
    if (!this.sensors[sensorReading.sensorId]) {
      return Errors.errResult('must detect an incorrect sensorId field', 'BAD_ID');
    } else if(this.sensorReadings[sensorReading.sensorId]) {
      let index = this.sensorReadings[sensorReading.sensorId].findIndex((currentSensorReading) => currentSensorReading.timestamp === sensorReading.timestamp);
      if(index >= 0) {
        this.sensorReadings[sensorReading.sensorId][index] = sensorReading;
      } else {
        this.sensorReadings[sensorReading.sensorId].push(sensorReading);
      }
    } else {
      this.sensorReadings[sensorReading.sensorId] = [sensorReading];
    }
    return Errors.okResult([sensorReading]);
  }

  /** Find sensor-types which satify req. Returns [] if none. 
   *  Note that all primitive SensorType fields can be used to filter.
   *  The returned array must be sorted by sensor-type id.
   */
  findSensorTypes(req: FlatReq) : Errors.Result<SensorType[]> {
    const validResult: Errors.Result<Checked<FlatReq>> =
      validateFindCommand('findSensorTypes', req);
    if (!validResult.isOk) return validResult;
    //TODO
    const filteredSensorTypes: SensorType[] = [];
    for (const currentSensorType of Object.values(this.sensorTypes)) {
      let flag = true;
      for (const filterFieldName of Object.keys(req)) {
        if (req[filterFieldName] != currentSensorType[filterFieldName as keyof SensorType]) {
          flag = false;
          break;
        }
      }
      if(flag) {
        filteredSensorTypes.push(currentSensorType);
      }
    }
    return Errors.okResult(filteredSensorTypes);
  }
  
  /** Find sensors which satify req. Returns [] if none. 
   *  Note that all primitive Sensor fields can be used to filter.
   *  The returned array must be sorted by sensor id.
   */
  findSensors(req: FlatReq) : Errors.Result<Sensor[]> { 
    //TODO
    const validResult: Errors.Result<Checked<FlatReq>> =
      validateFindCommand('findSensors', req);
    if (!validResult.isOk) return validResult;

    const filteredSensors: Sensor[] = [];
    for (const currentSensor of Object.values(this.sensors)) {
      let flag = true;
      for (const filterFieldName of Object.keys(req)) {
        if (req[filterFieldName] != currentSensor[filterFieldName as keyof Sensor]) {
          flag = false;
          break;
        }
      }
      if(flag) {
        filteredSensors.push(currentSensor);
      }
    }

    return Errors.okResult(filteredSensors);
  }
  
  /** Find sensor readings which satify req. Returns [] if none.  Note
   *  that req must contain sensorId to specify the sensor whose
   *  readings are being requested.  Additionally, it may use
   *  partially specified inclusive bounds [minTimestamp,
   *  maxTimestamp] and [minValue, maxValue] to filter the results.
   *
   *  The returned array must be sorted numerically by timestamp.
   */
  findSensorReadings(req: FlatReq) : Errors.Result<SensorReading[]> {
    //TODO
    return Errors.okResult([]);
  }
  
}

/*********************** SensorsInfo Factory Functions *****************/

export function makeSensorsInfo(sensorTypes: FlatReq[]=[],
				sensors: FlatReq[]=[],
				sensorReadings: FlatReq[]=[])
  : Errors.Result<SensorsInfo>
{
  const sensorsInfo = new SensorsInfo();
  const addResult =
    addSensorsInfo(sensorTypes, sensors, sensorReadings, sensorsInfo);
  return (addResult.isOk) ? Errors.okResult(sensorsInfo) : addResult;
}

export function addSensorsInfo(sensorTypes: FlatReq[], sensors: FlatReq[],
			       sensorReadings: FlatReq[],
			       sensorsInfo: SensorsInfo)
  : Errors.Result<void>
{
  for (const sensorType of sensorTypes) {
    const result = sensorsInfo.addSensorType(sensorType);
    if (!result.isOk) return result;
  }
  for (const sensor of sensors) {
    const result = sensorsInfo.addSensor(sensor);
    if (!result.isOk) return result;
  }
  for (const reading of sensorReadings) {
    const result = sensorsInfo.addSensorReading(reading);
    if (!result.isOk) return result;
  }
  return Errors.VOID_RESULT;
}



/****************************** Utilities ******************************/

//TODO add any utility functions or classes
