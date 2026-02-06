1. 資料結構設計
首先，我們在定義 Edge 時，將 type 設為一個 陣列（Array）。

JavaScript

const edgesData = [
  { id: 1, from: 1, to: 2, types: ['friend', 'colleague'] },
  { id: 2, from: 2, to: 3, types: ['family'] },
  { id: 3, from: 3, to: 4, types: ['colleague'] }
];
const edges = new vis.DataSet(edgesData);
2. 邏輯實作：條件著色與淡化
當你要進行「高亮特定類型」的操作時，邏輯如下：

取得目前選定的標籤（例如：selectedType = 'friend'）。

遍歷所有 Edge。

如果 types 陣列包含該標籤，賦予鮮豔顏色；如果不包含，賦予淡化顏色。

JavaScript

function highlightType(selectedType) {
  const allEdges = edges.get();
  
  const updates = allEdges.map(edge => {
    // 檢查該 edge 的 types 陣列是否包含目標類型
    const isActive = edge.types.includes(selectedType);
    
    return {
      id: edge.id,
      color: {
        color: isActive ? '#2B7CE9' : '#E5E5E5', // 鮮豔藍 vs 淺灰色
        opacity: isActive ? 1.0 : 0.2           // 也可以調整透明度增加效果
      },
      width: isActive ? 3 : 1                   // 活耀的邊可以加粗
    };
  });

  edges.update(updates);
}
3. 進階：支援「多選」過濾
如果你希望「只要包含選中標籤中的 任一個 就著色」，可以改用 .some()：

JavaScript

// 假設選取了多個標籤：['friend', 'family']
function highlightMultipleTypes(selectedTypesArray) {
  const updates = edges.get().map(edge => {
    // 只要 edge.types 裡面有任何一個元素存在於 selectedTypesArray 中
    const isActive = edge.types.some(t => selectedTypesArray.includes(t));
    
    return {
      id: edge.id,
      color: isActive ? '#2B7CE9' : '#E5E5E5',
      opacity: isActive ? 1.0 : 0.1
    };
  });
  edges.update(updates);
}