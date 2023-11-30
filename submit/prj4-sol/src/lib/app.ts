import { Errors } from 'cs544-js-utils';
import { PagedValues, makeSensorsWs, SensorsWs } from './sensors-ws.js';

import init from './init.js';
import { makeElement, getFormData } from './utils.js';

export default function makeApp(wsUrl: string) {
  const ws = makeSensorsWs(wsUrl);
  init();
  //TODO: add call to select initial tab and calls to set up
  selectTab('addSensorType');
  //form submit listeners
  addSensorTypeListener('addSensorType', ws);
  addSensorListener('addSensor', ws);
  findSensorTypeListener('findSensorTypes', ws);
  findSensorsListener('findSensors', ws);
}

function selectTab(rootId:string) {
  document.getElementById(rootId + '-tab')?.setAttribute('checked', 'checked');
}

function getSubmitButtonEle(rootId: string) {
  let element: HTMLElement = document.getElementById(rootId + '-form')!;
  return [...element.getElementsByTagName('button')!][0];
}

function addSensorTypeListener(rootId: string, ws: SensorsWs) {
  let formElement: HTMLFormElement = document.querySelector('#' + rootId + '-form')!;
  let mySubButton: HTMLButtonElement = getSubmitButtonEle(rootId);
  mySubButton.addEventListener('click', async function (event) {
    event.preventDefault();
    clearErrors(rootId);
    let result = await ws.addSensorType(getFormData(formElement));
    if(!result.isOk) {
      displayErrors(rootId, result.errors);
    } else {
      showAddSuccessData(rootId, result?.val);
    }
  });
}

function addSensorListener(rootId: string, ws: SensorsWs) {
  let formElement: HTMLFormElement = document.querySelector('#' + rootId + '-form')!;
  let mySubButton: HTMLButtonElement = getSubmitButtonEle(rootId);
  mySubButton.addEventListener('click', async function (event) {
    event.preventDefault();
    clearErrors(rootId);
    let result = await ws.addSensor(getFormData(formElement));
    if(!result.isOk) {
      displayErrors(rootId, result.errors);
    } else {
      showAddSuccessData(rootId, result?.val);
    }
  });
}

function showAddSuccessData(rootId: string, successData: {[key: string]: string}) {
  let divEle = document.getElementById(rootId + '-results')!;
  divEle.innerHTML = '';
  let dlEle = makeDlElement(successData);
  divEle.appendChild(dlEle);
}

function makeDlElement(successData: {[key: string]: string}) {
  let dl = makeElement('dl', {class: 'result'}, '');
  for (const [key, value] of Object.entries(successData)) {
    const dt = makeElement('dt', {}, key);
    const dd = makeElement('dd', {}, value);
    dl.appendChild(dt);
    dl.appendChild(dd);
  }
  return dl;
}

function findSensorTypeListener(rootId: string, ws: SensorsWs) {
  let formElement: HTMLFormElement = document.querySelector('#' + rootId + '-form')!;
  let mySubButton: HTMLButtonElement = getSubmitButtonEle(rootId);
  mySubButton.addEventListener('click', async function (event) {
    event.preventDefault();
    clearErrors(rootId);
    let result = await ws.findSensorTypesByReq(getFormData(formElement));
    if(!result.isOk) {
      displayErrors(rootId, result.errors);
    } else {
      showFindSuccessData(rootId, result?.val);
      setEventHandlersOnClones(rootId, ws, result?.val?.prev, result?.val?.next);
      updateScrollControls(rootId, result?.val?.prev, result?.val?.next);
    }
  });
}

function findSensorsListener(rootId: string, ws: SensorsWs) {
  let formElement: HTMLFormElement = document.querySelector('#' + rootId + '-form')!;
  let mySubButton: HTMLButtonElement = getSubmitButtonEle(rootId);
  mySubButton.addEventListener('click', async function (event) {
    event.preventDefault();
    clearErrors(rootId);
    let result = await ws.findSensorsByReq(getFormData(formElement));
    if(!result.isOk) {
      displayErrors(rootId, result.errors);
    } else {
      showFindSuccessData(rootId, result?.val);
      setEventHandlersOnClones(rootId, ws, result?.val?.prev, result?.val?.next);
      updateScrollControls(rootId, result?.val?.prev, result?.val?.next);
    }
  });
}

function showFindSuccessData(rootId: string, pagedValues: PagedValues) {
  const ulEle = document.getElementById(rootId + '-results')!;
  ulEle.innerHTML = '';
  for (const searchDataItem of pagedValues?.values) {
    // const liEle = makeElement('li', {}, '');
    // const dlEle = makeDlElement(searchDataItem);
    // liEle.appendChild(dlEle);
    // ulEle.appendChild(liEle);
    const dlEle = makeDlElement(searchDataItem);
    ulEle.appendChild(dlEle);
  }
}

// Function to handle the click event on the '>>' button
async function handleScrollClick(event: MouseEvent, rootId: string, ws: SensorsWs, pageLink: string) {
  event.preventDefault();
  clearErrors(rootId);
  let result =  await getFindData(rootId, ws, pageLink);
  if (!result.isOk) {
    displayErrors(rootId, result.errors);
  } else {
    showFindSuccessData(rootId, result?.val);
    setEventHandlersOnClones(rootId, ws, result?.val?.prev, result?.val?.next);
    updateScrollControls(rootId, result?.val?.prev, result?.val?.next);
  }
}

async function getFindData(rootId: string, ws: SensorsWs, pageLink: string): Promise<Errors.Result<PagedValues>> {
  if ('findSensorTypes' === rootId) {
    return await ws.findSensorTypesByRelLink(pageLink);
  } else {
    return await ws.findSensorsByRelLink(pageLink);
  }
}

function setEventHandlersOnClones(rootId: string, ws: SensorsWs, prev: string = '', next: string = '') {
  const tabEle = document.getElementById(rootId + '-content')!;
  const scrollContainers = tabEle.querySelectorAll('.scroll')!;
  scrollContainers.forEach((scrollContainer) => {
    const prevBtns = scrollContainer.querySelectorAll('[rel="prev"]');
    const nextBtns = scrollContainer.querySelectorAll('[rel="next"]');

    prevBtns.forEach((prevBtn) => {
      const prevBtnClone = prevBtn.cloneNode(true);
      prevBtnClone.addEventListener('click', (event: MouseEvent) => handleScrollClick(event, rootId, ws, prev));
      prevBtn.replaceWith(prevBtnClone);
    });

    nextBtns.forEach((nextBtn) => {
      const nextBtnClone = nextBtn.cloneNode(true);
      nextBtnClone.addEventListener('click', (event: MouseEvent) => handleScrollClick(event, rootId, ws, next));
      nextBtn.replaceWith(nextBtnClone);
    });
  });
}

function updateScrollControls(rootId: string, prev: string | undefined, next: string | undefined) {
  const tabEle = document.getElementById(rootId + '-content')!;
  const scrollContainers = tabEle.querySelectorAll('.scroll')!;
  scrollContainers.forEach((scrollContainer) => {
    const prevBtns = scrollContainer.querySelectorAll('[rel="prev"]');
    const nextBtns = scrollContainer.querySelectorAll('[rel="next"]');

    // Show/hide '<<' buttons based on 'prev' property
    prevBtns.forEach((prevBtn: HTMLElement) => {
      setVisibility(prevBtn, !!prev);
    });

    // Show/hide '>>' buttons based on 'next' property
    nextBtns.forEach((nextBtn: HTMLElement) => {
      setVisibility(nextBtn, !!next);
    });
  });
}

//TODO: functions to select a tab and set up form submit listeners

/** clear out all errors within tab specified by rootId */
function clearErrors(rootId: string) {
  document.querySelectorAll(`.${rootId}-errors`).forEach( el => {
    el.innerHTML = '';
  });
}

/** Display errors for rootId.  If an error has a widget widgetId such
 *  that an element having ID `${rootId}-${widgetId}-error` exists,
 *  then the error message is added to that element; otherwise the
 *  error message is added to the element having to the element having
 *  ID `${rootId}-errors` wrapped within an `<li>`.
 */  
function displayErrors(rootId: string, errors: Errors.Err[]) {
  for (const err of errors) {
    const id = err.options.widget;
    const widget = id && document.querySelector(`#${rootId}-${id}-error`);
    if (widget) {
      widget.append(err.message);
    }
    else {
      const li = makeElement('li', {class: 'error'}, err.message);
      document.querySelector(`#${rootId}-errors`)!.append(li);
    }
  }
}

/** Turn visibility of element on/off based on isVisible.  This
 *  is done by adding class "show" or "hide".  It presupposes
 *  that "show" and "hide" are set up with appropriate CSS styles.
 */
function setVisibility(element: HTMLElement, isVisible: boolean) {
  element.classList.add(isVisible ? 'show' : 'hide');
  element.classList.remove(isVisible ? 'hide' : 'show');
}


