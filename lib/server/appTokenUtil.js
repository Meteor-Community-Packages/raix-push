const AppTokenUtil = {
  getAppTokensBasedOnQuery: getAppTokensBasedOnQuery
};

function getAppTokensBasedOnQuery(query) {
  let userActiveMap = new Map();

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

  let vet = GlobalVets.findOne({appIdentifier: appTokens[0].appName});
  let users = Meteor.users.find({_id: {$in: [...userIdsSet]}}).fetch();

  users.forEach(user => {
    if (user.accountDisabledPerVet && user.accountDisabledPerVet[vet._id]) {
      userActiveMap.set(user._id, false);
    }
  });

  return appTokens.filter(appToken => {
    if (appToken.userId) {
      if (!userActiveMap.get(appToken.userId)) {
        return false;
      }
    }

    return true;
  });

}

export {AppTokenUtil};
