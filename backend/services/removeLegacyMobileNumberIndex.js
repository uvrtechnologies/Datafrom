async function removeLegacyMobileNumberIndex(collection, db) {
  const collectionExists = await db
    .listCollections({ name: collection.collectionName }, { nameOnly: true })
    .hasNext();
  if (!collectionExists) return;

  const indexes = await collection.indexes();
  const legacyIndex = indexes.find((index) => (
    index.unique
    && Object.keys(index.key).length === 1
    && index.key['mainMember.mobileNumber'] === 1
  ));

  if (legacyIndex) {
    await collection.dropIndex(legacyIndex.name);
    console.log('Removed legacy unique index on mainMember.mobileNumber.');
  }
}

module.exports = removeLegacyMobileNumberIndex;
