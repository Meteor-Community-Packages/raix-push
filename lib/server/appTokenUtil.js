const AppTokenUtil = {
  getAppTokensBasedOnQuery: getAppTokensBasedOnQuery
};

function getAppTokensBasedOnQuery(query) {
  let userDisabledMap = new Map();

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
    let isUserDisabled = user.accountDisabledPerVet && user.accountDisabledPerVet[vet._id];
    userDisabledMap.set(user._id, isUserDisabled);
  });

  return appTokens.filter(appToken => {
    if (appToken.userId) {
      if (userDisabledMap.get(appToken.userId)) {
        return false;
      }
    }

    return true;
  });

}

export {AppTokenUtil};
