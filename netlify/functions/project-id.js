exports.handler = async () => {
  const mySecret = process.env.PROJECT_ID;
  return {
    statusCode: 200,
    body: JSON.stringify({ value: mySecret }),
  };
};
