
const AppTokenUtil = {
  getAppTokensBasedOnQuery: getAppTokensBasedOnQuery
};

function getAppTokensBasedOnQuery(query) {
  let userVetActiveMap = new Map();
  let vetMap = new Map();

  let userIdsSet = new Set();

  let appTokens = Push.appTokens.find(query).fetch();

  if (!appTokens.length) {
    return [];
  }

  appTokens.forEach(function (appToken) {
    if (appToken.userId) {
      userIdsSet.add(appToken.userId);
    }

  });

  let vets = GlobalVets.find({appIdentifier: appTokens[0].appName}).fetch();
  let users = Meteor.users.find({_id: {$in: [...userIdsSet]}}).fetch();

  vets.forEach(vet => {
    vetMap.set(vet._id, vet.appIdentifier);
  });

  users.forEach(user => {
    user.vetId.forEach(vetId => {
      if (user.accountDisabledPerVet && user.accountDisabledPerVet[vetId]) {
        userVetActiveMap.set(user._id + vetMap.get(vetId), false);
      } else {
        userVetActiveMap.set(user._id + vetMap.get(vetId), true);
      }
    });
  });

  return appTokens.filter(appToken => {
    if (appToken.userId) {
      if (!userVetActiveMap.get(appToken.userId + appToken.appName)) {
        return false;
      }
    }

    return true;
  });

}

export {AppTokenUtil};
