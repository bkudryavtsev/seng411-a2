class GSheet {
  constructor(scriptUrl) {
    this.scriptUrl = scriptUrl;
  }

  appendRow(row) {
    const formData = new FormData();
    for (const [key, value] of Object.entries(row)) {
      formData.append(key, value);
    }

    return fetch(this.scriptUrl, { method: 'POST', body: formData });
  }

  appendRows(rows) {
    return rows.reduce((p, row) => p.then(() => this.appendRow(row)), Promise.resolve());
  }
}

export default GSheet;