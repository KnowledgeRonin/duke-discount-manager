import { loadFromFabricJSON } from '../src/lib/canvas/parser';
import { SVG_LIBRARY } from '../src/data/library';

const testItem = SVG_LIBRARY[0];
if (testItem.type === 'JSON' && testItem.canvasData) {
    const result = loadFromFabricJSON(testItem.canvasData);
    console.log(JSON.stringify(result, null, 2));
}
