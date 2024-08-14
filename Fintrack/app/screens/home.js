import React, { useContext, useState, useEffect, useCallback } from "react";
import {
  SafeAreaView,
  View,
  FlatList,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
} from "react-native";
import FooterList from "../components/footer/footerList";
import { AuthContext } from "../context/auth";
import { ActivityIndicator } from "react-native";
import {
  createLinkToken,
  exchangePublicToken,
  getBalance,
  getTransactions,
  syncTransactions,
} from "../../api/plaidAPI";
import { getBalanceDb, getTransactionsDb } from "../../api/db";
import DefaultText from "../components/defaultText";
import { useTheme } from "../context/themeContext";
import AccountSlider from "../components/accountSlider";
import Recurring from "../components/recurring";
import FontAwesome5Icon from "react-native-vector-icons/FontAwesome5";

const Home = () => {
  const [state, setState] = useContext(AuthContext);
  const { theme, toggleTheme } = useTheme();

  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const [balance, setBalance] = useState(null);
  const [accounts, setAccounts] = useState([]);
  const [transactions, setTransactions] = useState([]);
  // console.log("home.js auth console: ", state);

  const options = {
    // weekday: "long",
    year: "numeric",
    // month: "long",
    month: "numeric",
    day: "numeric",
    // hour: "numeric",
    // minute: "numeric",
    // second: "numeric",
    // timeZoneName: "short",
  };
  const userId = state.user.userId;

  const onRefresh = useCallback(() => {
    try {
      setRefreshing(true);
      fetchBalance();
      fetchTransactions();
    } catch (error) {
      console.log("Error in refreshing: ", error);
    } finally {
      setRefreshing(false);
    }
    // fetchBalance();
    // fetchTransactions();
    // setRefreshing(false);
  }, []);

  const fetchBalance = async () => {
    try {
      const response = await getBalance(userId);
      // console.log("Balance Plaid: ", response);
      console.log("Balance Plaid");
      const netBalance = response.netBalance.reduce(
        (sum, account) => sum + (account.balances.current || 0),
        0
      );
      setBalance(netBalance);
      fetchBalanceDB();
    } catch (error) {
      console.log("Error fetching balance: ", error);
      setBalance(null);
    }
  };

  const fetchBalanceDB = async () => {
    try {
      const response = await getBalanceDb(userId);
      // console.log("Balance DB: ", response.netBalance);
      console.log("Balance DB");
      const netBalance = response.netBalance.reduce(
        (sum, account) => sum + (account.balances.current || 0),
        0
      );
      setBalance(netBalance);

      const accounts = response.netBalance.map((account) => ({
        accountId: account.account_id,
        name: account.name,
        balances: account.balances.current,
      }));
      setAccounts(accounts);
    } catch (error) {
      console.log("Error fetching balance: ", error);
      setBalance(null);
    }
  };

  const fetchTransactions = async () => {
    try {
      setLoading(true);
      const response = await syncTransactions(userId);
      console.log("Transactions synced Plaid: ", response);
      fetchTransactionsDB();
      setLoading(false);
    } catch (error) {
      console.log("Error in fetching transactions: ", error);
      setLoading(false);
    }
  };

  const fetchTransactionsDB = async () => {
    try {
      setLoading(true);
      const response = await getTransactionsDb(userId, 5, null);
      // console.log("Transactions DB: ", response);
      console.log("Transactions DB");
      setTransactions(response.transactions);
      setLoading(false);
    } catch (error) {
      console.log("Error in fetching transactions: ", error);
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBalanceDB();
    fetchTransactionsDB();
  }, [state.user.userId]);

  const renderTransactions = ({ item }) => (
    <View
      style={{
        flexDirection: "row",
        justifyContent: "space-between",
        padding: 10,
        borderBottomWidth: 1,
        borderBottomColor: "#ccc",
      }}
    >
      <DefaultText>
        {new Intl.DateTimeFormat("en-US", options).format(new Date(item.date))}
      </DefaultText>
      <DefaultText>{item.name}</DefaultText>
      <DefaultText>£ {item.amount.toFixed(2)}</DefaultText>
    </View>
  );

  return (
    <>
      <View
        style={{
          // flex: 1,
          // justifyContent: "space-between",
          // alignItems: "center",
          padding: 10,
          backgroundColor: theme.background,
          height: "92%",
        }}
      >
        <ScrollView
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
            />
          }
        >
          <View
            style={{
              flexDirection: "row",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <View>
              <DefaultText style={{ fontSize: 30, color: theme.text }}>
                Hi {state.user.name}
              </DefaultText>
            </View>
            <View>
              {/* <DefaultText>Check</DefaultText> */}
              <TouchableOpacity style={{ padding: 10 }} onPress={toggleTheme}>
                <FontAwesome5Icon
                  name="star-half-alt"
                  style={{ color: theme.text }}
                />
              </TouchableOpacity>
            </View>
          </View>

          <View style={{ marginVertical: 10 }}>
            <DefaultText style={{ fontSize: 20 }}>
              My Total Balance: £ {balance}
            </DefaultText>
          </View>

          <View>
            {/* <View style={{ flexDirection: "row", justifyContent: "space-between" }}> */}
            <AccountSlider
              accounts={accounts}
              onAddAccountSuccess={fetchBalanceDB}
            />
          </View>

          <View style={{ margin: 10 }}>
            <DefaultText style={{ fontSize: 20 }}>
              Total Transactions...
            </DefaultText>
            <FlatList
              // data={transactions.slice(0, 5)}
              data={transactions}
              renderItem={renderTransactions}
              scrollEnabled={false}
              keyExtractor={(item, index) =>
                item.id?.toString() || index.toString()
              }
            />
          </View>

          <View style={{ margin: 10 }}>
            <Recurring />
          </View>
        </ScrollView>
      </View>
      <FooterList />

      {/* Loading Overlay */}
      {loading && (
        <View
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: "gray",
            opacity: 0.85, // Semi-transparent background
            justifyContent: "center",
            alignItems: "center",
            zIndex: 1000, 
          }}
        >
          <ActivityIndicator size="large" color="#000" />
          <DefaultText style={{ marginTop: 10, fontSize: 16, color: "#000" }}>
            Loading...
          </DefaultText>
        </View>
      )}
    </>
  );
};

export default Home;
